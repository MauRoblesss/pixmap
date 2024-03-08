/*
 *
 */
import {
  getIPFromRequest,
  getIPv6Subnet,
} from '../../utils/ip';
import {
  getBanInfo,
  unbanIP,
} from '../../data/sql/Ban';
import {
  getCacheAllowed,
  cleanCacheForIP,
} from '../../data/redis/isAllowedCache';

async function baninfo(req, res, next) {
  try {
    const { t } = req.ttag;

    const ip = getIPv6Subnet(
      getIPFromRequest(req),
    );

    const info = await getBanInfo(ip);

    if (!info) {
      const cache = await getCacheAllowed(ip);
      if (cache && cache.status === 2) {
        cleanCacheForIP(ip);
      }
      throw new Error(t`You are not banned`);
    }
    let sleft = (info.expires)
      ? Math.round((info.expires.getTime() - Date.now()) / 1000)
      : 0;

    if (info.expires && sleft < 3) {
      await unbanIP(ip);
      sleft = -1;
    }

    res.status(200).json({
      reason: info.reason,
      sleft,
      mod: `${info.mod.name} (${info.mod.id})`,
    });
  } catch (err) {
    next(err);
  }
}

export default baninfo;
