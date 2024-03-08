/*
 *
 * Database layout for Chat Channels
 *
 */

import { DataTypes, Utils } from 'sequelize';

import sequelize from './sequelize';
import RegUser from './RegUser';

const Channel = sequelize.define('Channel', {
  // Channel ID
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },

  name: {
    type: `${DataTypes.CHAR(32)} CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    allowNull: true,
  },

  /*
   * 0: public channel
   * 1: DM
   * 2: Group (not implemented)
   * 3: faction (not implemented)
   */
  type: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 0,
  },

  lastMessage: {
    type: DataTypes.DATE,
    defaultValue: new Utils.Literal('CURRENT_TIMESTAMP'),
    allowNull: false,
  },
}, {
  updatedAt: false,

  getterMethods: {
    lastTs() {
      return new Date(this.lastMessage).valueOf();
    },
  },
  setterMethods: {
    lastTs(ts) {
      this.setDataValue('lastMessage', new Date(ts).toISOString());
    },
  },
});

/*
 * Direct Message User id
 * just set if channel is DM
 * (associating it here allows us too
 * keep track of users leaving and joining DMs and ending up
 * in the same conversation)
 * dmu1id < dmu2id
 */
Channel.belongsTo(RegUser, {
  as: 'dmu1',
  foreignKey: 'dmu1id',
});
Channel.belongsTo(RegUser, {
  as: 'dmu2',
  foreignKey: 'dmu2id',
});

export default Channel;
