/*
 * main websocket server
 */
import WebSocket from 'ws';

import logger from '../core/logger';
import canvases from '../core/canvases';
import MassRateLimiter from '../utils/MassRateLimiter';
import Counter from '../utils/Counter';
import { getIPFromRequest, getHostFromRequest } from '../utils/ip';
import {
  REG_CANVAS_OP,
  PIXEL_UPDATE_OP,
  REG_CHUNK_OP,
  REG_MCHUNKS_OP,
  DEREG_CHUNK_OP,
  DEREG_MCHUNKS_OP,
} from './packets/op';
import {
  hydrateRegCanvas,
  hydrateRegChunk,
  hydrateDeRegChunk,
  hydrateRegMChunks,
  hydrateDeRegMChunks,
  hydratePixelUpdate,
  dehydrateChangeMe,
  dehydrateOnlineCounter,
  dehydrateCoolDown,
  dehydratePixelReturn,
  dehydrateCaptchaReturn,
} from './packets/server';
import socketEvents from './socketEvents';
import chatProvider, { ChatProvider } from '../core/ChatProvider';
import authenticateClient from './authenticateClient';
import drawByOffsets from '../core/draw';
import isIPAllowed from '../core/isAllowed';
import { HOUR } from '../core/constants';
import { checkCaptchaSolution } from '../data/redis/captcha';


const ipCounter = new Counter();
const rateLimiter = new MassRateLimiter(HOUR);

class SocketServer {
  // WebSocket.Server
  wss;
  // Map<number, Array>
  CHUNK_CLIENTS;

  constructor() {
    this.CHUNK_CLIENTS = new Map();

    this.broadcastPixelBuffer = this.broadcastPixelBuffer.bind(this);
    this.reloadUser = this.reloadUser.bind(this);
    this.onlineCounterBroadcast = this.onlineCounterBroadcast.bind(this);
    this.checkHealth = this.checkHealth.bind(this);
  }

  initialize() {
    logger.info('Starting websocket server');

    const wss = new WebSocket.Server({
      perMessageDeflate: false,
      clientTracking: true,
      maxPayload: 65536,
      // path: "/ws",
      // server,
      noServer: true,
    });
    this.wss = wss;

    wss.on('error', (e) => {
      logger.error(`WebSocket Server Error ${e.message}`);
    });

    wss.on('connection', (ws, req) => {
      ws.timeLastMsg = Date.now();
      ws.connectedTs = ws.timeLastMsg;
      ws.canvasId = null;
      const { user } = req;
      ws.user = user;
      ws.chunkCnt = 0;

      const { ip } = user;

      ws.send(dehydrateOnlineCounter(socketEvents.onlineCounter));

      ws.on('error', (e) => {
        // eslint-disable-next-line max-len
        logger.error(`WebSocket Client Error for ${ws.user.name}: ${e.message}`);
      });

      ws.on('close', () => {
        ipCounter.delete(ip);
        this.deleteAllChunks(ws);
      });

      ws.on('message', (data, isBinary) => {
        ws.timeLastMsg = Date.now();
        if (isBinary) {
          this.onBinaryMessage(data, ws);
        } else {
          const message = data.toString();
          this.onTextMessage(message, ws);
        }
      });
    });

    socketEvents.on('onlineCounter', (online) => {
      const onlineBuffer = dehydrateOnlineCounter(online);
      this.broadcast(onlineBuffer);
    });
    socketEvents.on('pixelUpdate', this.broadcastPixelBuffer);
    socketEvents.on('reloadUser', this.reloadUser);

    socketEvents.on('suChatMessage', (
      userId,
      name,
      message,
      channelId,
      id,
      country,
    ) => {
      const text = `cm,${JSON.stringify(
        [name, message, country, channelId, id],
      )}`;
      this.findAllWsByUerId(userId).forEach((ws) => {
        ws.send(text);
      });
    });

    socketEvents.on('chatMessage', (
      name,
      message,
      channelId,
      id,
      country,
    ) => {
      const text = `cm,${JSON.stringify(
        [name, message, country, channelId, id],
      )}`;
      const clientArray = [];
      this.wss.clients.forEach((ws) => {
        if (ws.user && chatProvider.userHasChannelAccess(ws.user, channelId)) {
          clientArray.push(ws);
        }
      });
      SocketServer.broadcastSelected(clientArray, text);
    });

    socketEvents.on('addChatChannel', (userId, channelId, channelArray) => {
      this.findAllWsByUerId(userId).forEach((ws) => {
        ws.user.addChannel(channelId, channelArray);
        const text = `ac,${JSON.stringify({
          [channelId]: channelArray,
        })}`;
        ws.send(text);
      });
    });

    socketEvents.on('remChatChannel', (userId, channelId) => {
      this.findAllWsByUerId(userId).forEach((ws) => {
        ws.user.removeChannel(channelId);
        const text = `rc,${JSON.stringify(channelId)}`;
        ws.send(text);
      });
    });

    socketEvents.on('rateLimitTrigger', (ip, blockTime) => {
      rateLimiter.forceTrigger(ip, blockTime);
      const amount = this.killAllWsByUerIp(ip);
      if (amount) {
        logger.warn(`Killed ${amount} connections for RateLimit`);
      }
    });

    setInterval(this.onlineCounterBroadcast, 20 * 1000);
    setInterval(this.checkHealth, 15 * 1000);
  }

  static async onRateLimitTrigger(ip, blockTime, reason) {
    logger.warn(
      `Client ${ip} triggered Socket-RateLimit by ${reason}.`,
    );
    socketEvents.broadcastRateLimitTrigger(ip, blockTime);
  }

  async handleUpgrade(request, socket, head) {
    const { headers } = request;
    const ip = getIPFromRequest(request);
    // trigger proxycheck
    isIPAllowed(ip);
    /*
     * rate limit
     */
    const isLimited = rateLimiter.tick(
      ip,
      3000,
      'connection attempts',
      SocketServer.onRateLimitTrigger,
    );
    if (isLimited) {
      socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n');
      socket.destroy();
      return;
    }
    /*
     * enforce CORS
     */
    const { origin } = headers;
    const host = getHostFromRequest(request, false, true);
    if (!origin
      || !`.${origin.slice(origin.indexOf('//') + 2)}`.endsWith(host)
    ) {
      // eslint-disable-next-line max-len
      logger.info(`Rejected CORS request on websocket from ${ip} via ${headers.origin}, expected ${getHostFromRequest(request, false, true)}`);
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }
    /*
     * Limiting socket connections per ip
     */
    if (ipCounter.get(ip) > 50) {
      SocketServer.onRateLimitTrigger(ip, HOUR, 'too many connections');
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }
    ipCounter.add(ip);

    const user = await authenticateClient(request);
    if (!user) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    request.user = user;
    this.wss.handleUpgrade(request, socket, head, (ws) => {
      this.wss.emit('connection', ws, request);
    });
  }

  /**
   * https://github.com/websockets/ws/issues/617
   * @param data
   */
  static broadcastSelected(clients, data) {
    let frames;

    if (typeof data === 'string') {
      frames = WebSocket.Sender.frame(Buffer.from(data), {
        readOnly: false,
        mask: false,
        rsv1: false,
        opcode: 1,
        fin: true,
      });
    } else {
      frames = WebSocket.Sender.frame(data, {
        readOnly: false,
        mask: false,
        rsv1: false,
        opcode: 2,
        fin: true,
      });
    }

    return clients.map((ws) => new Promise((resolve) => {
      if (ws.readyState === WebSocket.OPEN) {
        // eslint-disable-next-line no-underscore-dangle
        ws._sender.sendFrame(frames, (err) => {
          if (err) {
            logger.error(
              // eslint-disable-next-line max-len
              `WebSocket broadcast error on ${ws.user && ws.user.ip} : ${err.message}`,
            );
          }
        });
      }
      resolve();
    }));
  }

  broadcast(data) {
    const clientArray = [];
    this.wss.clients.forEach((ws) => {
      clientArray.push(ws);
    });
    SocketServer.broadcastSelected(clientArray, data);
  }

  /*
   * keep in mind that a user could
   * be connected from multiple devices
   */
  findWsByUserId(userId) {
    const it = this.wss.clients.keys();
    let client = it.next();
    while (!client.done) {
      const ws = client.value;
      if (ws.readyState === WebSocket.OPEN
        && ws.user
        && ws.user.id === userId
      ) {
        return ws;
      }
      client = it.next();
    }
    return null;
  }

  findAllWsByUerId(userId) {
    const clients = [];
    const it = this.wss.clients.keys();
    let client = it.next();
    while (!client.done) {
      const ws = client.value;
      if (ws.readyState === WebSocket.OPEN
        && ws.user
        && ws.user.id === userId
      ) {
        clients.push(ws);
      }
      client = it.next();
    }
    return clients;
  }

  killAllWsByUerIp(ip) {
    let amount = ipCounter.get(ip);
    if (!amount) return 0;

    for (const [chunkid, clients] of this.CHUNK_CLIENTS.entries()) {
      const newClients = clients.filter((ws) => ws.user.ip !== ip);
      if (clients.length !== newClients.length) {
        this.CHUNK_CLIENTS.set(chunkid, newClients);
      }
    }

    const it = this.wss.clients.keys();
    amount = 0;
    let client = it.next();
    while (!client.done) {
      const ws = client.value;
      if (ws.readyState === WebSocket.OPEN
        && ws.user?.ip === ip
      ) {
        /*
         * we deleted all registered chunks above
         * have to reset it to avoid onClose to
         * do it again.
         */
        ws.chunkCnt = 0;
        ws.terminate();
        amount += 1;
      }
      client = it.next();
    }
    return amount;
  }

  broadcastPixelBuffer(canvasId, chunkid, data) {
    if (this.CHUNK_CLIENTS.has(chunkid)) {
      const clients = this.CHUNK_CLIENTS.get(chunkid)
        .filter((ws) => ws.canvasId === canvasId);
      SocketServer.broadcastSelected(clients, data);
    }
  }

  reloadUser(name) {
    this.wss.clients.forEach(async (ws) => {
      if (ws.user.name === name) {
        await ws.user.reload();
        const buffer = dehydrateChangeMe();
        ws.send(buffer);
      }
    });
  }

  checkHealth() {
    const ts = Date.now() - 120 * 1000;
    const promises = [];
    this.wss.clients.forEach((ws) => {
      promises.push(new Promise((resolve) => {
        if (
          ws.readyState === WebSocket.OPEN
          && ts > ws.timeLastMsg
        ) {
          logger.info(`Killing dead websocket from ${ws.user.ip}`);
          ws.terminate();
          resolve();
        }
      }),
      );
    });
    return promises;
  }

  onlineCounterBroadcast() {
    try {
      const online = {};
      online.total = ipCounter.amount() || 0;
      const ipsPerCanvas = {};
      const it = this.wss.clients.keys();
      let client = it.next();
      while (!client.done) {
        const ws = client.value;
        if (ws.readyState === WebSocket.OPEN
          && ws.user && ws.canvasId !== null
        ) {
          const { canvasId } = ws;
          const { ip } = ws.user;
          // only count unique IPs per canvas
          if (!ipsPerCanvas[canvasId]) {
            ipsPerCanvas[canvasId] = [ip];
          } else if (ipsPerCanvas[canvasId].includes(ip)) {
            client = it.next();
            continue;
          } else {
            ipsPerCanvas[canvasId].push(ip);
          }
          //--
          if (!online[canvasId]) {
            online[canvasId] = 0;
          }
          online[canvasId] += 1;
        }
        client = it.next();
      }
      socketEvents.broadcastOnlineCounter(online);
    } catch (err) {
      logger.error(`WebSocket online broadcast error: ${err.message}`);
    }
  }

  async onTextMessage(text, ws) {
    const { ip } = ws.user;
    // rate limit
    const isLimited = rateLimiter.tick(
      ip,
      1000,
      'text message spam',
      SocketServer.onRateLimitTrigger,
    );
    if (isLimited) {
      return;
    }
    // ---
    try {
      const comma = text.indexOf(',');
      if (comma === -1) {
        throw new Error('No comma');
      }
      const key = text.slice(0, comma);
      const val = JSON.parse(text.slice(comma + 1));
      const { user } = ws;
      switch (key) {
        case 'cm': {
          // chat message
          const message = val[0].trim();
          if (!user.isRegistered || !message) {
            return;
          }
          const channelId = val[1];
          /*
           * if DM channel, make sure that other user has DM open
           * (needed because we allow user to leave one-sided
           *  and auto-join on message)
           */
          const dmUserId = chatProvider.checkIfDm(user, channelId);
          if (dmUserId) {
            const dmWs = this.findWsByUserId(dmUserId);
            if (!dmWs
              || !chatProvider.userHasChannelAccess(dmWs.user, channelId)
            ) {
              // TODO this is really ugly
              // DMS have to be rethought
              if (!user.addedDM) user.addedDM = [];
              if (!user.addedDM.includes(dmUserId)) {
                await ChatProvider.addUserToChannel(
                  dmUserId,
                  channelId,
                  [user.name, 1, Date.now(), user.id],
                );
                user.addedDM.push(dmUserId);
              }
            }
          }
          socketEvents.recvChatMessage(user, message, channelId);
          break;
        }
        case 'cs': {
          // captcha solution
          const [solution, captchaid] = val;
          const ret = await checkCaptchaSolution(
            solution,
            ip,
            false,
            captchaid,
          );
          ws.send(dehydrateCaptchaReturn(ret));
          break;
        }
        default:
          throw new Error('Unknown key');
      }
    } catch (err) {
      // eslint-disable-next-line max-len
      logger.error(`Got invalid ws text message ${text} from ${ws.user.ip}, with error: ${err.message}`);
    }
  }

  async onBinaryMessage(buffer, ws) {
    try {
      const { ip } = ws.user;
      const opcode = buffer[0];

      // rate limit
      let limiterDeltaTime = 200;
      let reason = 'socket spam';
      if (opcode === REG_CHUNK_OP) {
        limiterDeltaTime = 40;
        reason = 'register chunk spam';
      } else if (opcode === DEREG_CHUNK_OP) {
        limiterDeltaTime = 10;
        reason = 'deregister chunk spam';
      }
      const isLimited = rateLimiter.tick(
        ip,
        limiterDeltaTime,
        reason,
        SocketServer.onRateLimitTrigger,
      );
      if (isLimited) {
        return;
      }
      // ----

      switch (opcode) {
        case PIXEL_UPDATE_OP: {
          const { canvasId, connectedTs } = ws;

          if (canvasId === null) {
            logger.info(`Closing websocket without canvas from ${ip}`);
            ws.close();
            return;
          }

          const {
            i, j, pixels,
          } = hydratePixelUpdate(buffer);
          const {
            wait,
            coolDown,
            pxlCnt,
            rankedPxlCnt,
            retCode,
          } = await drawByOffsets(
            ws.user,
            canvasId,
            i, j,
            pixels,
            connectedTs,
          );

          if (retCode > 9 && retCode !== 13) {
            rateLimiter.add(ip, 800);
          }

          ws.send(dehydratePixelReturn(
            retCode,
            wait,
            coolDown,
            pxlCnt,
            rankedPxlCnt,
          ));
          break;
        }
        case REG_CANVAS_OP: {
          const canvasId = hydrateRegCanvas(buffer);
          if (!canvases[canvasId]) return;
          if (ws.canvasId !== canvasId) {
            this.deleteAllChunks(ws);
          }
          ws.canvasId = canvasId;
          const wait = await ws.user.getWait(canvasId);
          ws.send(dehydrateCoolDown(wait));
          break;
        }
        case REG_CHUNK_OP: {
          const chunkid = hydrateRegChunk(buffer);
          this.pushChunk(chunkid, ws);
          break;
        }
        case REG_MCHUNKS_OP: {
          this.deleteAllChunks(ws);
          hydrateRegMChunks(buffer, (chunkid) => {
            this.pushChunk(chunkid, ws);
          });
          break;
        }
        case DEREG_CHUNK_OP: {
          const chunkid = hydrateDeRegChunk(buffer);
          this.deleteChunk(chunkid, ws);
          break;
        }
        case DEREG_MCHUNKS_OP: {
          hydrateDeRegMChunks(buffer, (chunkid) => {
            this.deleteChunk(chunkid, ws);
          });
          break;
        }
        default:
          break;
      }
    } catch (e) {
      logger.error(`WebSocket Client Binary Message Error: ${e.message}`);
    }
  }

  pushChunk(chunkid, ws) {
    if (ws.chunkCnt === 20000) {
      const { ip } = ws.user;
      SocketServer.onRateLimitTrigger(ip, HOUR, 'too much subscribed');
      return;
    }
    ws.chunkCnt += 1;
    let clients = this.CHUNK_CLIENTS.get(chunkid);
    if (!clients) {
      clients = [];
      this.CHUNK_CLIENTS.set(chunkid, clients);
    }
    const pos = clients.indexOf(ws);
    if (~pos) return;
    clients.push(ws);
  }

  deleteChunk(chunkid, ws) {
    ws.chunkCnt -= 1;
    if (!this.CHUNK_CLIENTS.has(chunkid)) return;
    const clients = this.CHUNK_CLIENTS.get(chunkid);
    const pos = clients.indexOf(ws);
    if (~pos) clients.splice(pos, 1);
  }

  deleteAllChunks(ws) {
    if (!ws.chunkCnt) {
      return;
    }
    for (const client of this.CHUNK_CLIENTS.values()) {
      const pos = client.indexOf(ws);
      if (~pos) {
        client.splice(pos, 1);
        ws.chunkCnt -= 1;
        if (!ws.chunkCnt) return;
      }
    }
  }
}

export default SocketServer;
