/*
 *
 * Junction table for User -> Channels
 * A channel can be anything,
 * Group, Public Chat, DM, etc.
 *
 */

import { DataTypes } from 'sequelize';
import sequelize from './sequelize';

const UserChannel = sequelize.define('UserChannel', {
  lastRead: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  timestamps: false,
});

export default UserChannel;
