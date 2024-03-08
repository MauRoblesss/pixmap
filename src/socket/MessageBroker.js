/*
 * sends messages to other ppfun instances
 * to work as cluster
 * If methods have no descriptions, they can be checked in ./SockEvents.js
 */

/* eslint-disable no-console */

import { SHARD_NAME } from '../core/config';
import SocketEvents from './SockEvents';
import {
  ONLINE_COUNTER_OP,
  PIXEL_UPDATE_MB_OP,
  CHUNK_UPDATE_MB_OP,
} from './packets/op';
import {
  hydrateOnlineCounter,
  hydratePixelUpdateMB,
  hydrateChunkUpdateMB,
  dehydratePixelUpdate,
  dehydrateOnlineCounter,
  dehydratePixelUpdateMB,
  dehydrateChunkUpdateMB,
} from './packets/server';
import { pubsub } from '../data/redis/client';
import { combineObjects } from '../core/utils';

/*
 * channel that all shards share and listen to
 */
const BROADCAST_CHAN = 'bc';
/*
 * prefix of channel that a specific shard listens to,
 * for receiving targeted messages
 */
const LISTEN_PREFIX = 'l';
/*
 * channel where only one shard sends to is the name
 * of the shard and has no prefix
 */


class MessageBroker extends SocketEvents {
  constructor() {
    super();
    this.isCluster = true;
    this.thisShard = SHARD_NAME;
    /*
     * currently running cross-shard requests,
     * are tracked in order to only send them to receiving
     * shard
     * [{
     *   id: request id,
     *   shard: requesting shard name,
     *   ts: timestamp of request,
     * },...]
     */
    this.csReq = [];
    /*
     * all other shards
     */
    this.shards = {};
    /*
     * online counter of all shards including ourself
     */
    this.shardOnlineCounters = [];
    this.publisher = {
      publish: () => {},
    };
    this.subscriber = {
      subscribe: () => {},
      unsubscribe: () => {},
    };
    this.checkHealth = this.checkHealth.bind(this);
    setInterval(this.checkHealth, 10000);
  }

  async initialize() {
    this.publisher = pubsub.publisher;
    this.subscriber = pubsub.subscriber;
    // broadcast chan
    await this.subscriber.subscribe(BROADCAST_CHAN, (...args) => {
      this.onShardBCMessage(...args);
    });
    // shard specific listener
    await this.subscriber.subscribe(
      `${LISTEN_PREFIX}:${this.thisShard}`,
      (...args) => {
        this.onShardListenMessage(...args);
      },
    );
    // give other shards 30s to announce themselves
    await new Promise((resolve) => {
      setTimeout(resolve, 25000);
    });
    console.log('CLUSTER: Initialized message broker');
  }

  /*
   * messages on shared broadcast channels that every shard is listening to
   */
  async onShardBCMessage(message) {
    try {
      /*
       * messages from own shard get dropped
       */
      if (!message || message.startsWith(this.thisShard)) {
        return;
      }
      const comma = message.indexOf(',');
      /*
       * any message in the form of 'shard:type,JSONArrayData'
       * straight emitted as socket event
       */
      if (~comma) {
        const key = message.slice(message.indexOf(':') + 1, comma);
        console.log('CLUSTER: Broadcast', key);
        const val = JSON.parse(message.slice(comma + 1));
        if (key.startsWith('req:')) {
          // cross-shard requests
          const shard = message.slice(0, message.indexOf(':'));
          const id = val[0];
          this.csReq.push({
            id,
            shard,
            ts: Date.now(),
          });
        }
        super.emit(key, ...val);
        return;
      }
      /*
       * other messages are shard names that announce the existence
       * of a shard
       */
      if (!this.shards[message]) {
        console.log(`CLUSTER: Shard ${message} connected`);
        this.shards[message] = Date.now();
        await this.subscriber.subscribe(
          message,
          (buffer) => this.onShardBinaryMessage(buffer, message),
          true,
        );
        // immediately give new shards information
        this.publisher.publish(BROADCAST_CHAN, this.thisShard);
        return;
      }
      this.shards[message] = Date.now();
    } catch (err) {
      console.error(`CLUSTER: Error on broadcast message: ${err.message}`);
    }
  }

  /*
   * messages on shard specific listener channel
   * messages in form `type,JSONArrayData`
   * straight emitted as socket event
   */
  async onShardListenMessage(message) {
    try {
      const comma = message.indexOf(',');
      const key = message.slice(0, comma);
      console.log(`CLUSTER shard listener got ${key}`);
      const val = JSON.parse(message.slice(comma + 1));
      super.emit(key, ...val);
    } catch (err) {
      console.error(`CLUSTER: Error on listener message: ${err.message}`);
    }
  }

  getLowestActiveShard() {
    let lowest = 0;
    let lShard = null;
    this.shardOnlineCounters.forEach((shardData) => {
      const [shard, cnt] = shardData;
      if (cnt.total < lowest || !lShard) {
        lShard = shard;
        lowest = cnt.total;
      }
    });
    return lShard || this.thisShard;
  }

  amIImportant() {
    /*
     * important main shard does tasks like running RpgEvent
     * or updating rankings
     */
    return !this.shardOnlineCounters[0]
      || this.shardOnlineCounters[0][0] === this.thisShard;
  }

  /*
   * requests that go over all shards and combine responses from all
   */
  req(type, ...args) {
    return new Promise((resolve, reject) => {
      const chan = Math.floor(Math.random() * 100000).toString()
        + Math.floor(Math.random() * 100000).toString();
      const chankey = `res:${chan}`;
      let id;
      let amountOtherShards = this.shardOnlineCounters.length;
      let ret = null;
      const callback = (retn) => {
        amountOtherShards -= 1;
        ret = combineObjects(ret, retn);
        if (amountOtherShards <= 0) {
          console.log(`CLUSTER res:${chan}:${type} finished`);
          this.off(chankey, callback);
          clearTimeout(id);
          resolve(ret);
        } else {
          // eslint-disable-next-line
          console.log(`CLUSTER got res:${chan}:${type} from shard, ${amountOtherShards} still left`);
        }
      };
      id = setTimeout(() => {
        this.off(chankey, callback);
        if (ret) {
          resolve(ret);
        } else {
          reject(new Error(`CLUSTER Timeout on wait for res:${chan}:${type}`));
        }
      }, 45000);
      this.on(chankey, callback);
      this.emit(`req:${type}`, chan, ...args);
    });
  }

  res(chan, ret) {
    // only response to requesting shard
    const csre = this.csReq.find((r) => r.id === chan);
    // eslint-disable-next-line
    console.log(`CLUSTER send res:${chan} to shard ${csre && csre.shard}`);
    if (csre) {
      this.publisher.publish(
        `${LISTEN_PREFIX}:${csre.shard}`,
        `res:${chan},${JSON.stringify([ret])}`,
      );
      this.csReq = this.csReq.filter((r) => r.id !== chan);
    } else {
      super.emit(`res:${chan}`, ret);
    }
  }

  updateShardOnlineCounter(shard, cnt) {
    const shardCounter = this.shardOnlineCounters.find(
      (c) => c[0] === shard,
    );
    if (!shardCounter) {
      this.shardOnlineCounters.push([shard, cnt]);
      this.shardOnlineCounters.sort((a, b) => a[0].localeCompare(b[0]));
    } else {
      shardCounter[1] = cnt;
    }
    this.sumOnlineCounters();
  }

  /*
   * messages on binary shard channels, where specific shards send from
   */
  onShardBinaryMessage(buffer, shard) {
    try {
      const opcode = buffer[0];
      switch (opcode) {
        case PIXEL_UPDATE_MB_OP: {
          const puData = hydratePixelUpdateMB(buffer);
          super.emit('pixelUpdate', ...puData);
          const chunkId = puData[1];
          const chunk = [chunkId >> 8, chunkId & 0xFF];
          super.emit('chunkUpdate', puData[0], chunk);
          break;
        }
        case CHUNK_UPDATE_MB_OP: {
          super.emit('chunkUpdate', ...hydrateChunkUpdateMB(buffer));
          break;
        }
        case ONLINE_COUNTER_OP: {
          const cnt = hydrateOnlineCounter(buffer);
          this.updateShardOnlineCounter(shard, cnt);
          break;
        }
        default:
          // nothing
      }
    } catch (err) {
      // eslint-disable-next-line max-len
      console.error(`CLUSTER: Error on binary message of shard ${shard}: ${err.message}`);
    }
  }

  sumOnlineCounters() {
    const newCounter = {};
    this.shardOnlineCounters.forEach((shardData) => {
      const [, cnt] = shardData;
      Object.keys(cnt).forEach((canv) => {
        const num = cnt[canv];
        if (newCounter[canv]) {
          newCounter[canv] += num;
        } else {
          newCounter[canv] = num;
        }
      });
    });
    this.onlineCounter = newCounter;
  }

  /*
   * intercept all events and distribute them to others
   */
  emit(key, ...args) {
    super.emit(key, ...args);
    const msg = `${this.thisShard}:${key},${JSON.stringify(args)}`;
    this.publisher.publish(BROADCAST_CHAN, msg);
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
    this.publisher.publish(
      this.thisShard,
      dehydratePixelUpdateMB(canvasId, i, j, pixels),
    );
    const buffer = dehydratePixelUpdate(i, j, pixels);
    super.emit('pixelUpdate', canvasId, chunkId, buffer);
    super.emit('chunkUpdate', canvasId, [i, j]);
  }

  setCoolDownFactor(fac) {
    if (this.amIImportant()) {
      this.emit('setCoolDownFactor', fac);
    } else {
      super.emit('setCoolDownFactor', fac);
    }
  }

  recvChatMessage(
    user,
    message,
    channelId,
  ) {
    super.emit('recvChatMessage', user, message, channelId);
  }

  broadcastChunkUpdate(
    canvasId,
    chunk,
  ) {
    this.publisher.publish(
      this.thisShard,
      dehydrateChunkUpdateMB(canvasId, chunk),
    );
    super.emit('chunkUpdate', canvasId, chunk);
  }

  broadcastOnlineCounter(online) {
    this.updateShardOnlineCounter(this.thisShard, online);
    // send our online counter to other shards
    const buffer = dehydrateOnlineCounter(online);
    this.publisher.publish(this.thisShard, buffer);
    // send total counter to our players
    super.emit('onlineCounter', this.onlineCounter);
  }

  checkHealth() {
    // remove disconnected shards
    let threshold = Date.now() - 30000;
    const { shards } = this;
    Object.keys(shards).forEach((shard) => {
      if (shards[shard] < threshold) {
        console.log(`CLUSTER: Shard ${shard} disconnected`);
        delete shards[shard];
        const counterIndex = this.shardOnlineCounters.findIndex(
          (c) => c[0] === shard,
        );
        if (~counterIndex) {
          this.shardOnlineCounters.splice(counterIndex, 1);
        }
        this.subscriber.unsubscribe(shard);
      }
    });
    // send keep alive to others
    this.publisher.publish(BROADCAST_CHAN, this.thisShard);
    // clean up dead shard requests
    threshold -= 30000;
    this.csReq = this.csReq.filter((r) => r.ts > threshold);
  }
}

export default MessageBroker;
