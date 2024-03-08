/**
 *
 */

import { DataTypes } from 'sequelize';
import sequelize from './sequelize';


const Whitelist = sequelize.define('Whitelist', {
  ip: {
    type: DataTypes.CHAR(39),
    allowNull: false,
    primaryKey: true,
  },
}, {
  timestamps: true,
  updatedAt: false,
});

/*
 * check if ip is whitelisted
 * @param ip
 * @return boolean
 */
export async function isWhitelisted(ip) {
  const count = await Whitelist
    .count({
      where: { ip },
    });
  return count !== 0;
}

/*
 * whitelist ip
 * @param ip
 * @return true if whitelisted,
 *         false if it was already whitelisted
 */
export async function whitelistIP(ip) {
  const [, created] = await Whitelist.findOrCreate({
    where: { ip },
  });
  return created;
}

/*
 * remove ip from whitelist
 * @param ip
 * @return true if unwhitelisted,
 *         false if ip wasn't whitelisted anyway
 */
export async function unwhitelistIP(ip) {
  const count = await Whitelist.destroy({
    where: { ip },
  });
  return !!count;
}

export default Whitelist;
