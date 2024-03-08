import { DataTypes, Op } from 'sequelize';
import sequelize from './sequelize';

import RegUser from './RegUser';
import { HourlyCron } from '../../utils/cron';
import { cleanCacheForIP } from '../redis/isAllowedCache';

const Ban = sequelize.define('Ban', {
  ip: {
    type: DataTypes.CHAR(39),
    allowNull: false,
    primaryKey: true,
  },

  reason: {
    type: `${DataTypes.CHAR(200)} CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    allowNull: false,
  },

  /*
   * expiration time,
   * NULL if infinite
   */
  expires: {
    type: DataTypes.DATE,
  },

  /*
   * uid of mod who made the ban
   */
  muid: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
  },
}, {
  timestamps: true,
  updatedAt: false,

  setterMethods: {
    reason(value) {
      this.setDataValue('reason', value.slice(0, 200));
    },
  },
});

Ban.belongsTo(RegUser, {
  as: 'mod',
  foreignKey: 'muid',
});

async function cleanBans() {
  const expiredIPs = await Ban.findAll({
    attributes: [
      'ip',
    ],
    where: {
      expires: {
        [Op.lte]: new Date(),
      },
    },
    raw: true,
  });
  const ips = [];
  for (let i = 0; i < expiredIPs.length; i += 1) {
    ips.push(expiredIPs[i].ip);
  }
  await Ban.destroy({
    where: {
      ip: ips,
    },
  });
  for (let i = 0; i < ips.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await cleanCacheForIP(ips[i]);
  }
}
HourlyCron.hook(cleanBans);

/*
 * check if ip is whitelisted
 * @param ip
 * @return boolean
 */
export async function isIPBanned(ip) {
  const count = await Ban
    .count({
      where: { ip },
    });
  return count !== 0;
}

/*
 * get information of ban
 * @param ip
 * @return
 */
export function getBanInfo(ip) {
  return Ban.findByPk(ip, {
    attributes: ['reason', 'expires'],
    include: {
      model: RegUser,
      as: 'mod',
      attributes: [
        'id',
        'name',
      ],
    },
    raw: true,
    nest: true,
  });
}

/*
 * ban ip
 * @param ip
 * @return true if banned
 *         false if already banned
 */
export async function banIP(
  ip,
  reason,
  expiresTs,
  muid,
) {
  const expires = (expiresTs) ? new Date(expiresTs).toISOString() : null;
  const [, created] = await Ban.upsert({
    ip,
    reason,
    expires,
    muid,
  });
  await cleanCacheForIP(ip);
  return created;
}

/*
 * unban ip
 * @param ip
 * @return true if unbanned,
 *         false if ip wasn't banned anyway
 */
export async function unbanIP(ip) {
  const count = await Ban.destroy({
    where: { ip },
  });
  await cleanCacheForIP(ip);
  return !!count;
}

export default Ban;
