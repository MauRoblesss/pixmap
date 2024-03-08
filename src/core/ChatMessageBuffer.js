/*
 * Buffer for chatMessages for the server
 * it just buffers the most recent 200 messages for each channel
 *
 */
import Sequelize from 'sequelize';
import logger from './logger';

import { Message, Channel } from '../data/sql';

const MAX_BUFFER_TIME = 120000;

class ChatMessageBuffer {
  constructor(socketEvents) {
    this.buffer = new Map();
    this.timestamps = new Map();

    this.cleanBuffer = this.cleanBuffer.bind(this);
    this.cleanLoop = setInterval(this.cleanBuffer, 3 * 60 * 1000);
    this.addMessage = this.addMessage.bind(this);
    this.socketEvents = socketEvents;
    socketEvents.on('chatMessage', this.addMessage);
  }

  async getMessages(cid, limit = 30) {
    if (limit > 200) {
      return ChatMessageBuffer.getMessagesFromDatabase(cid, limit);
    }

    let messages = this.buffer.get(cid);
    if (!messages) {
      messages = await ChatMessageBuffer.getMessagesFromDatabase(cid);
      this.buffer.set(cid, messages);
    }
    this.timestamps.set(cid, Date.now());
    return messages.slice(-limit);
  }

  cleanBuffer() {
    const curTime = Date.now();
    const toDelete = [];
    this.timestamps.forEach((cid, timestamp) => {
      if (curTime > timestamp + MAX_BUFFER_TIME) {
        toDelete.push(cid);
      }
    });
    toDelete.forEach((cid) => {
      this.buffer.delete(cid);
      this.timestamps.delete(cid);
    });
    logger.info(
      `Cleaned ${toDelete.length} channels from chat message buffer`,
    );
  }

  async broadcastChatMessage(
    name,
    message,
    cid,
    uid,
    flag = 'xx',
    sendapi = true,
  ) {
    if (message.length > 200) {
      return;
    }
    Message.create({
      name,
      flag,
      message,
      cid,
      uid,
    });
    Channel.update({
      lastMessage: Sequelize.literal('CURRENT_TIMESTAMP'),
    }, {
      where: {
        id: cid,
      },
    });
    /*
     * goes through socket events and then comes
     * back at addMessage
     */
    this.socketEvents.broadcastChatMessage(
      name,
      message,
      cid,
      uid,
      flag,
      sendapi,
    );
  }

  async addMessage(
    name,
    message,
    cid,
    uid,
    flag,
  ) {
    const messages = this.buffer.get(cid);
    if (messages) {
      messages.push([
        name,
        message,
        flag,
        uid,
        Math.round(Date.now() / 1000),
      ]);
    }
  }

  static async getMessagesFromDatabase(cid, limit = 200) {
    const messagesModel = await Message.findAll({
      attributes: [
        'message',
        'uid',
        'name',
        'flag',
        [
          Sequelize.fn('UNIX_TIMESTAMP', Sequelize.col('createdAt')),
          'ts',
        ],
      ],
      where: { cid },
      limit,
      order: [['createdAt', 'DESC']],
      raw: true,
    });
    const messages = [];
    let i = messagesModel.length;
    while (i > 0) {
      i -= 1;
      const {
        message,
        uid,
        name,
        flag,
        ts,
      } = messagesModel[i];
      messages.push([
        name,
        message,
        flag,
        uid,
        ts,
      ]);
    }
    return messages;
  }
}

export default ChatMessageBuffer;
