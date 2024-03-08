/*
 *
 */
import {
  getIPFromRequest,
  getIPv6Subnet,
} from '../../utils/ip';
import {
  getIIDofIP,
} from '../../data/sql/IPInfo';

async function getiid(req, res, next) {
  try {
    const ip = getIPv6Subnet(
      getIPFromRequest(req),
    );

    const iid = await getIIDofIP(ip);

    if (!iid) {
      throw new Error('Could not get IID');
    }

    res.status(200).json({
      iid,
    });
  } catch (err) {
    next(err);
  }
}

export default getiid;
