/*
 * class for chat communications
 */
import { Op } from 'sequelize';
import logger from './logger';
import RateLimiter from '../utils/RateLimiter';
import {
  Channel, RegUser, UserChannel, Message,
} from '../data/sql';
import { findIdByNameOrId } from '../data/sql/RegUser';
import ChatMessageBuffer from './ChatMessageBuffer';
import socketEvents from '../socket/socketEvents';
import isIPAllowed from './isAllowed';
import {
  mutec, unmutec,
  unmutecAll, listMutec,
  mute,
  unmute,
  allowedChat,
} from '../data/redis/chat';
import { banIP } from '../data/sql/Ban';
import { DailyCron } from '../utils/cron';
import { escapeMd } from './utils';
import ttags from './ttag';

import { USE_MAILER } from './config';
import {
  CHAT_CHANNELS,
  EVENT_USER_NAME,
  INFO_USER_NAME,
  APISOCKET_USER_NAME,
} from './constants';

function getUserFromMd(mdUserLink) {
  let mdUser = mdUserLink.trim();
  if (mdUser[0] === '@') {
    mdUser = mdUser.substring(1);
    if (mdUser[0] === '[' && mdUser[mdUser.length - 1] === ')') {
      // if mdUser ping, select Id
      mdUser = mdUser.substring(
        mdUser.lastIndexOf('(') + 1, mdUser.length - 1,
      ).trim();
    }
  }
  return mdUser;
}

export class ChatProvider {
  constructor() {
    this.defaultChannels = {};
    this.langChannels = {};
    this.publicChannelIds = [];
    this.enChannelId = 0;
    this.infoUserId = 1;
    this.eventUserId = 1;
    this.autobanPhrase = null;
    this.apiSocketUserId = 1;
    this.caseCheck = /^[A-Z !.]*$/;
    this.cyrillic = /[\u0436-\u043B]'/;
    this.substitutes = [
      {
        regexp: /http[s]?:\/\/(old.)?pixmap\.fun\/#/g,
        replace: '#',
      },
    ];
    this.chatMessageBuffer = new ChatMessageBuffer(socketEvents);
    this.clearOldMessages = this.clearOldMessages.bind(this);

    socketEvents.on('recvChatMessage', async (user, message, channelId) => {
      const errorMsg = await this.sendMessage(user, message, channelId);
      if (errorMsg) {
        socketEvents.broadcastSUChatMessage(
          user.id,
          'info',
          errorMsg,
          channelId,
          this.infoUserId,
          'il',
        );
      }
    });
  }

  async clearOldMessages() {
    if (!socketEvents.amIImportant()) {
      return;
    }
    const ids = Object.keys(this.defaultChannels);
    for (let i = 0; i < ids.length; i += 1) {
      const cid = ids[i];
      Message.destroy({
        where: {
          cid,
          createdAt: {
            [Op.lt]: new Date(new Date() - 10 * 24 * 3600 * 1000),
          },
        },
      });
    }
  }

  async initialize() {
    // find or create default channels
    for (let i = 0; i < CHAT_CHANNELS.length; i += 1) {
      const { name } = CHAT_CHANNELS[i];
      // eslint-disable-next-line no-await-in-loop
      const channel = await Channel.findOrCreate({
        where: { name },
        defaults: {
          name,
        },
      });
      const { id, type, lastTs } = channel[0];
      if (name === 'en') {
        this.enChannelId = id;
      }
      this.defaultChannels[id] = [
        name,
        type,
        lastTs,
      ];
      this.publicChannelIds.push(id);
    }
    // find or create non-english lang channels
    const langs = Object.keys(ttags);
    for (let i = 0; i < langs.length; i += 1) {
      const name = langs[i];
      if (name === 'default') {
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      const channel = await Channel.findOrCreate({
        where: { name },
        defaults: {
          name,
        },
      });
      const { id, type, lastTs } = channel[0];
      this.langChannels[name] = {
        id,
        type,
        lastTs,
      };
      this.publicChannelIds.push(id);
    }
    // find or create default users
    let name = INFO_USER_NAME;
    const infoUser = await RegUser.findOrCreate({
      attributes: [
        'id',
      ],
      where: { name },
      defaults: {
        name,
        verified: 3,
        email: 'info@example.com',
      },
      raw: true,
    });
    this.infoUserId = infoUser[0].id;
    name = EVENT_USER_NAME;
    const eventUser = await RegUser.findOrCreate({
      attributes: [
        'id',
      ],
      where: { name },
      defaults: {
        name,
        verified: 3,
        email: 'event@example.com',
      },
      raw: true,
    });
    this.eventUserId = eventUser[0].id;
    name = APISOCKET_USER_NAME;
    const apiSocketUser = await RegUser.findOrCreate({
      attributes: [
        'id',
      ],
      where: { name },
      defaults: {
        name,
        verified: 3,
        email: 'event@example.com',
      },
      raw: true,
    });
    this.apiSocketUserId = apiSocketUser[0].id;
    this.clearOldMessages();
    DailyCron.hook(this.clearOldMessages);
  }

  getDefaultChannels(lang) {
    const langChannel = {};
    if (lang && lang !== 'en') {
      const { langChannels } = this;
      if (langChannels[lang]) {
        const {
          id, type, lastTs,
        } = langChannels[lang];
        langChannel[id] = [lang, type, lastTs];
      }
    }
    return {
      ...langChannel,
      ...this.defaultChannels,
    };
  }

  static async addUserToChannel(
    userId,
    channelId,
    channelArray,
  ) {
    const [, created] = await UserChannel.findOrCreate({
      where: {
        UserId: userId,
        ChannelId: channelId,
      },
      raw: true,
    });

    if (created) {
      socketEvents.broadcastAddChatChannel(
        userId,
        channelId,
        channelArray,
      );
    }
  }

  /*
   * user.lang has to be set
   * this is just the case in chathistory.js and SocketServer
   */
  userHasChannelAccess(user, cid) {
    if (this.defaultChannels[cid]) {
      return true;
    }
    if (user.channels[cid]) {
      return true;
    }
    const { lang } = user;
    return !!(this.langChannels[lang]
      && this.langChannels[lang].id === cid);
  }

  checkIfDm(user, cid) {
    if (this.defaultChannels[cid]) {
      return null;
    }
    const channelArray = user.channels[cid];
    if (channelArray && channelArray.length === 4) {
      return user.channels[cid][3];
    }
    return null;
  }

  getHistory(cid, limit = 30) {
    return this.chatMessageBuffer.getMessages(cid, limit);
  }

  async adminCommands(message, channelId, user) {
    // admin commands
    const cmdArr = message.split(' ');
    const cmd = cmdArr[0].substring(1);
    const args = cmdArr.slice(1);
    const initiator = `@[${escapeMd(user.name)}](${user.id})`;
    switch (cmd) {
      case 'mute': {
        const timeMin = Number(args.slice(-1));
        if (args.length < 2 || Number.isNaN(timeMin)) {
          return this.mute(
            getUserFromMd(args.join(' ')),
            {
              printChannel: channelId,
              initiator,
            },
          );
        }
        return this.mute(
          getUserFromMd(args.slice(0, -1).join(' ')),
          {
            printChannel: channelId,
            initiator,
            duration: timeMin,
          },
        );
      }

      case 'unmute':
        return this.unmute(
          getUserFromMd(args.join(' ')),
          {
            printChannel: channelId,
            initiator,
          },
        );

      case 'mutec': {
        if (args[0]) {
          const cc = args[0].toLowerCase();
          const ret = await mutec(channelId, cc);
          if (ret === null) {
            return 'No legit country defined';
          }
          if (!ret) {
            return `Country ${cc} is already muted`;
          }
          if (ret) {
            this.broadcastChatMessage(
              'info',
              `Country ${cc} has been muted from this channel by ${initiator}`,
              channelId,
              this.infoUserId,
            );
          }
          return null;
        }
        return 'No country defined for mutec';
      }

      case 'unmutec': {
        if (args[0]) {
          const cc = args[0].toLowerCase();
          const ret = await unmutec(channelId, cc);
          if (ret === null) {
            return 'No legit country defined';
          }
          if (!ret) {
            return `Country ${cc} is not muted`;
          }
          this.broadcastChatMessage(
            'info',
            `Country ${cc} has been unmuted from this channel by ${initiator}`,
            channelId,
            this.infoUserId,
          );
          return null;
        }
        const ret = await unmutecAll(channelId);
        if (ret) {
          this.broadcastChatMessage(
            'info',
            `All countries unmuted from this channel by ${initiator}`,
            channelId,
            this.infoUserId,
          );
          return null;
        }
        return 'No country is currently muted from this channel';
      }

      case 'listmc': {
        const ccArr = await listMutec(channelId);
        if (ccArr.length) {
          return `Muted countries: ${ccArr}`;
        }
        return 'No country is currently muted from this channel';
      }

      case 'autoban': {
        if (args[0]) {
          this.autobanPhrase = args.join(' ');
          if (this.autobanPhrase === 'unset' || this.autobanPhrase.length < 5) {
            this.autobanPhrase = null;
          }
          return `Set autoban phrase on shard to ${this.autobanPhrase}`;
        }
        // eslint-disable-next-line
        if (this.autobanPhrase) {
          // eslint-disable-next-line
          return `Current autoban phrase on shard is ${this.autobanPhrase}, use "/autoban unset" to remove it`;
        }
        return 'Autoban phrase is currently not set on this shard';
      }

      default:
        return `Couldn't parse command ${cmd}`;
    }
  }

  /*
   * User.ttag for translation has to be set, this is just the case
   * in SocketServer for websocket connections
   * @param user User object
   * @param message string of message
   * @param channelId integer of channel
   * @return error message if unsuccessful, otherwise null
   */
  async sendMessage(
    user,
    message,
    channelId,
  ) {
    const { id } = user;
    const { t } = user.ttag;
    const { name } = user;

    if (!name || !id) {
      return null;
    }
    const country = user.regUser.flag || 'xx';

    if (name.trim() === ''
    //  || (Number(channelId) === 4374 && message.includes('discord'))
      || (this.autobanPhrase && message.includes(this.autobanPhrase))
    ) {
      const { ipSub } = user;
      if (!user.banned) {
        banIP(ipSub, 'CHATBAN', 0, 1);
        mute(id);
        logger.info(`CHAT AUTOBANNED: ${ipSub}`);
        user.banned = true;
      }
      return 'nope';
    }
    if (user.banned) {
      return 'nope';
    }

    if (!user.userlvl) {
      const [allowed, needProxycheck] = await allowedChat(
        channelId,
        id,
        user.ipSub,
        country,
      );
      if (allowed) {
        logger.info(
          `${name} / ${user.ip} tried to send chat message but is not allowed`,
        );
        if (allowed === 1) {
          return t`You can not send chat messages with proxy`;
        } if (allowed === 100 && user.userlvl === 0) {
          return t`Your country is temporary muted from this chat channel`;
        } if (allowed === 101) {
          // eslint-disable-next-line max-len
          return t`You are permanently muted, join our guilded to appeal the mute`;
        } if (allowed === 2) {
          return t`You are banned`;
        } if (allowed === 3) {
          return t`Your Internet Provider is banned`;
        } if (allowed < 0) {
          const ttl = -allowed;
          if (ttl > 120) {
            const timeMin = Math.round(ttl / 60);
            return t`You are muted for another ${timeMin} minutes`;
          }
          return t`You are muted for another ${ttl} seconds`;
        }
      }
      if (needProxycheck) {
        isIPAllowed(user.ip);
      }
    } else if (message.charAt(0) === '/') {
      return this.adminCommands(message, channelId, user);
    }

    if (!user.rateLimiter) {
      user.rateLimiter = new RateLimiter(20, 15, true);
    }
    const waitLeft = user.rateLimiter.tick();
    if (waitLeft) {
      const waitTime = Math.floor(waitLeft / 1000);
      // eslint-disable-next-line max-len
      return t`You are sending messages too fast, you have to wait ${waitTime}s :(`;
    }

    if (!this.userHasChannelAccess(user, channelId)) {
      return t`You don\'t have access to this channel`;
    }

    let displayCountry = country;
    if (user.userlvl !== 0) {
      displayCountry = 'zz';
    } else if (user.id === 2927) {
      /*
       * hard coded flags
       * TODO make it possible to modify user flags
       */
      displayCountry = 'bt';
    } else if (user.id === 41030) {
      displayCountry = 'to';
    }

    if (USE_MAILER && !user.regUser.verified) {
      return t`Your mail has to be verified in order to chat`;
    }

    for (let i = 0; i < this.substitutes.length; i += 1) {
      const substitute = this.substitutes[i];
      message = message.replace(substitute.regexp, substitute.replace);
    }

    if (message.length > 200) {
      // eslint-disable-next-line max-len
      return t`You can\'t send a message this long :(`;
    }

    if (message.match(this.cyrillic) && channelId === this.enChannelId) {
      return t`Please use int channel`;
    }

    if (user.last_message && user.last_message === message) {
      user.message_repeat += 1;
      if (user.message_repeat >= 4) {
        this.mute(name, { duration: 60, printChannel: channelId });
        user.message_repeat = 0;
        return t`Stop flooding.`;
      }
    } else {
      user.message_repeat = 0;
      user.last_message = message;
    }

    logger.info(
      `Received chat message ${message} from ${name} / ${user.ip}`,
    );
    this.broadcastChatMessage(
      name,
      message,
      channelId,
      id,
      displayCountry,
    );
    return null;
  }

  broadcastChatMessage(...args) {
    return this.chatMessageBuffer.broadcastChatMessage(...args);
  }

  async mute(nameOrId, opts) {
    const timeMin = opts.duration || null;
    const initiator = opts.initiator || null;
    const printChannel = opts.printChannel || null;

    const searchResult = await findIdByNameOrId(nameOrId);
    if (!searchResult) {
      return `Couldn't find user ${nameOrId}`;
    }
    const { name, id } = searchResult;
    const userPing = `@[${escapeMd(name)}](${id})`;

    mute(id, timeMin);
    if (printChannel) {
      if (timeMin) {
        this.broadcastChatMessage(
          'info',
          (initiator)
            ? `${userPing} has been muted for ${timeMin}min by ${initiator}`
            : `${userPing} has been muted for ${timeMin}min`,
          printChannel,
          this.infoUserId,
        );
      } else {
        this.broadcastChatMessage(
          'info',
          (initiator)
            ? `${userPing} has been muted forever by ${initiator}`
            : `${userPing} has been muted forever`,
          printChannel,
          this.infoUserId,
        );
      }
    }
    logger.info(`Muted user ${userPing}`);
    return null;
  }

  async unmute(nameOrId, opts) {
    const initiator = opts.initiator || null;
    const printChannel = opts.printChannel || null;

    const searchResult = await findIdByNameOrId(nameOrId);
    if (!searchResult) {
      return `Couldn't find user ${nameOrId}`;
    }
    const { name, id } = searchResult;
    const userPing = `@[${escapeMd(name)}](${id})`;

    const succ = await unmute(id);
    if (!succ) {
      return `User ${userPing} is not muted`;
    }
    if (printChannel) {
      this.broadcastChatMessage(
        'info',
        (initiator)
          ? `${userPing} has been unmuted by ${initiator}`
          : `${userPing} has been unmuted`,
        printChannel,
        this.infoUserId,
      );
    }
    logger.info(`Unmuted user ${userPing}`);
    return null;
  }
}

export default new ChatProvider();
