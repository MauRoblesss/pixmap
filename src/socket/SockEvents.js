/*
 * Events for WebSockets
 */
import EventEmitter from 'events';

import {
  dehydratePixelUpdate,
} from './packets/server';

class SocketEvents extends EventEmitter {
  constructor() {
    super();
    /*
     * {
     *   total: totalUsersOnline,
     *  canvasId: onlineUsers,
     *  ...
     *  }
     */
    this.onlineCounter = {
      total: 0,
    };
  }

  // eslint-disable-next-line class-methods-use-this
  async initialize() {
    // nothing, only for child classes
  }

  // eslint-disable-next-line class-methods-use-this
  getLowestActiveShard() {
    return null;
  }

  // eslint-disable-next-line class-methods-use-this
  amIImportant() {
    return true;
  }

  /*
   * async event
   */
  onAsync(evtString, cb) {
    this.on(evtString, (...args) => {
      setImmediate(() => {
        cb(...args);
      });
    });
  }

  /*
   * requests that expect a response
   * req(type, args) can be awaited
   * it will return a response from whatever listens on onReq(type, cb(args))
   * Keep the arguments serializable for shard support
   */
  req(type, ...args) {
    return new Promise((resolve, reject) => {
      const chan = Math.floor(Math.random() * 100000).toString()
        + Math.floor(Math.random() * 100000).toString();
      const chankey = `res:${chan}`;
      let id;
      const callback = (ret) => {
        clearTimeout(id);
        resolve(ret);
      };
      id = setTimeout(() => {
        this.off(chankey, callback);
        reject(new Error(`Timeout on req ${type}`));
      }, 45000);
      this.once(chankey, callback);
      this.emit(`req:${type}`, chan, ...args);
    });
  }

  res(chan, ret) {
    this.emit(`res:${chan}`, ret);
  }

  onReq(type, cb) {
    this.on(`req:${type}`, async (chan, ...args) => {
      const ret = await cb(...args);
      this.res(chan, ret);
    });
  }

  /*
   * broadcast pixel message via websocket
   * @param canvasId number ident of canvas
   * @param chunkid number id consisting of i,j chunk coordinates
   * @param pxls buffer with offset and color of one or more pixels
   */
  broadcastPixels(
    canvasId,
    chunkId,
    pixels,
  ) {
    const i = chunkId >> 8;
    const j = chunkId & 0xFF;
    const buffer = dehydratePixelUpdate(i, j, pixels);
    this.emit('pixelUpdate', canvasId, chunkId, buffer);
    this.emit('chunkUpdate', canvasId, [i, j]);
  }

  /*
   * chunk updates from event, image upload, etc.
   * everything that's not a pixelUpdate and changes chunks
   * @param canvasId
   * @param chunk [i,j] chunk coordinates
   */
  broadcastChunkUpdate(
    canvasId,
    chunk,
  ) {
    this.emit('chunkUpdate', canvasId, chunk);
  }

  /*
   * ask other shards to send email for us,
   * only used when USE_MAILER is false
   * @param type type of mail to send
   * @param args
   */
  sendMail(...args) {
    this.emit('mail', ...args);
  }

  /*
   * received Chat message on own websocket
   * @param user User Instance that sent the message
   * @param message text message
   * @param channelId numerical channel id
   */
  recvChatMessage(
    user,
    message,
    channelId,
  ) {
    this.emit('recvChatMessage', user, message, channelId);
  }

  /*
   * set cooldownfactor
   * (used by RpgEvent)
   * @param fac factor by which cooldown changes globally
   */
  setCoolDownFactor(fac) {
    this.emit('setCoolDownFactor', fac);
  }

  /*
   * broadcast chat message to all users in channel
   * @param name chatname
   * @param message Message to send
   * @param sendapi If chat message should get broadcasted to api websockets
   *                (useful if the api is supposed to not answer to its own messages)
   */
  broadcastChatMessage(
    name,
    message,
    channelId,
    id,
    country = 'xx',
    sendapi = true,
  ) {
    this.emit(
      'chatMessage',
      name,
      message,
      channelId,
      id,
      country || 'xx',
      sendapi,
    );
  }

  /*
   * send chat message to a single user in channel
   */
  broadcastSUChatMessage(
    targetUserId,
    name,
    message,
    channelId,
    id,
    country = 'xx',
  ) {
    this.emit(
      'suChatMessage',
      targetUserId,
      name,
      message,
      channelId,
      id,
      country || 'xx',
    );
  }

  /*
   * broadcast Assigning chat channel to user
   * @param userId numerical id of user
   * @param channelId numerical id of chat channel
   * @param channelArray array with channel info [name, type, lastTs]
   */
  broadcastAddChatChannel(
    userId,
    channelId,
    channelArray,
  ) {
    this.emit(
      'addChatChannel',
      userId,
      channelId,
      channelArray,
    );
  }

  /*
   * broadcast Removing chat channel from user
   * @param userId numerical id of user
   * @param channelId numerical id of chat channel
   *        (i.e. false if the user already gets it via api response)
   */
  broadcastRemoveChatChannel(
    userId,
    channelId,
  ) {
    this.emit('remChatChannel', userId, channelId);
  }

  /*
   * trigger rate limit of ip
   * @param ip
   * @param blockTime in ms
   */
  broadcastRateLimitTrigger(ip, blockTime) {
    this.emit('rateLimitTrigger', ip, blockTime);
  }

  /*
   * broadcast ranking list updates
   * @param {
   *   dailyRanking?: daily pixel raking top 100,
   *   ranking?: total pixel ranking top 100,
   *   prevTop?: top 10 of the previous day,
   * }
   */
  rankingListUpdate(rankings) {
    this.emit('rankingListUpdate', rankings);
  }

  /*
   * reload user on websocket to get changes
   */
  reloadUser(name) {
    this.emit('reloadUser', name);
  }

  /*
   * broadcast online counter
   * @param online Object of total and canvas online users
   *   (see this.onlineCounter)
   */
  broadcastOnlineCounter(online) {
    this.onlineCounter = online;
    this.emit('onlineCounter', online);
  }
}

export default SocketEvents;
