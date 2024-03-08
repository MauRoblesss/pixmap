import Whitelist from './Whitelist';
import RegUser from './RegUser';
import Channel from './Channel';
import UserChannel from './UserChannel';
import Message from './Message';
import UserBlock from './UserBlock';
import IPInfo from './IPInfo';

/*
 * User Channel access
 */
RegUser.belongsToMany(Channel, {
  as: 'channel',
  through: UserChannel,
});
Channel.belongsToMany(RegUser, {
  as: 'user',
  through: UserChannel,
});

/*
 * User blocks of other user
 *
 * uid: User that blocks
 * buid: User that is blocked
 */
RegUser.belongsToMany(RegUser, {
  as: 'blocked',
  through: UserBlock,
  foreignKey: 'uid',
});
RegUser.belongsToMany(RegUser, {
  as: 'blockedBy',
  through: UserBlock,
  foreignKey: 'buid',
});

export {
  Whitelist,
  RegUser,
  Channel,
  UserChannel,
  Message,
  UserBlock,
  IPInfo,
};
