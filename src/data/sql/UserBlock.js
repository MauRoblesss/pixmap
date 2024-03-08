/*
 *
 * Junction table for User -> Blocked User
 * Relations defined in ./index.js
 *
 */

import sequelize from './sequelize';

const UserBlock = sequelize.define('UserBlock', {
}, {
  timestamps: false,
});

export async function isUserBlockedBy(userId, blockedById) {
  const exists = await UserBlock.findOne({
    where: {
      uid: blockedById,
      buid: userId,
    },
    raw: true,
    attributes: ['uid'],
  });
  return !!exists;
}

export default UserBlock;
