import fs from 'fs';
import readline from 'readline';

import { PIXELLOGGER_PREFIX } from './logger';
import { getNamesToIds } from '../data/sql/RegUser';
import {
  getIdsToIps,
  getInfoToIps,
  getIPofIID,
} from '../data/sql/IPInfo';
import { getIPv6Subnet } from '../utils/ip';


function parseFile(cb) {
  const date = new Date();
  const year = date.getUTCFullYear();
  let month = date.getUTCMonth() + 1;
  let day = date.getUTCDate();
  if (day < 10) day = `0${day}`;
  if (month < 10) month = `0${month}`;
  const filename = `${PIXELLOGGER_PREFIX}${year}-${month}-${day}.log`;

  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(filename);

    const rl = readline.createInterface({
      input: fileStream,
    });

    rl.on('line', (line) => cb(line.split(' ')));

    rl.on('error', (err) => {
      reject(err);
    });

    rl.on('close', () => {
      resolve();
    });
  });
}

/*
 * Get summary of pixels per canvas placed by iid
 * @param iid Limit on one user (optional)
 * @param time timestamp of when to start
 * @return array of parsed pixel log lines
 *         string if error
 */
export async function getIIDSummary(
  iid,
  time,
) {
  const filterIP = await getIPofIID(iid);
  if (!filterIP) {
    return 'Could not resolve IID to IP';
  }
  const cids = {};

  try {
    await parseFile((parts) => {
      const [tsStr, ipFull,, cid, x, y,, clrStr] = parts;
      const ts = parseInt(tsStr, 10);
      if (ts >= time) {
        const ip = getIPv6Subnet(ipFull);
        if (ip === filterIP) {
          const clr = parseInt(clrStr, 10);
          let curVals = cids[cid];
          if (!curVals) {
            curVals = [0, 0, 0, 0, 0];
            cids[cid] = curVals;
          }
          curVals[0] += 1;
          curVals[1] = x;
          curVals[2] = y;
          curVals[3] = clr;
          curVals[4] = ts;
        }
      }
    });
  } catch (err) {
    return `Could not parse logfile: ${err.message}`;
  }

  const columns = ['rid', '#', 'canvas', 'last', 'clr', 'time'];
  const types = ['number', 'number', 'cid', 'coord', 'clr', 'ts'];
  const rows = [];
  const cidKeys = Object.keys(cids);
  for (let i = 0; i < cidKeys.length; i += 1) {
    const cid = cidKeys[i];
    const [pxls, x, y, clr, ts] = cids[cid];
    rows.push([
      i,
      pxls,
      cid,
      `${x},${y}`,
      clr,
      ts,
    ]);
  }

  return {
    columns,
    types,
    rows,
  };
}

/*
 * Get pixels by iid
 * @param iid Limit on one user (optional)
 * @param time timestamp of when to start
 * @return array of parsed pixel log lines
 *         string if error
 */
export async function getIIDPixels(
  iid,
  time,
  maxRows = 300,
) {
  const filterIP = await getIPofIID(iid);
  if (!filterIP) {
    return 'Could not resolve IID to IP';
  }
  const pixels = [];

  try {
    await parseFile((parts) => {
      const [tsStr, ipFull,, cid, x, y,, clrStr] = parts;
      const ts = parseInt(tsStr, 10);
      if (ts >= time) {
        const ip = getIPv6Subnet(ipFull);
        if (ip === filterIP) {
          const clr = parseInt(clrStr, 10);
          pixels.push([
            cid,
            x,
            y,
            clr,
            ts,
          ]);
        }
      }
    });
  } catch (err) {
    return `Could not parse logfile: ${err.message}`;
  }

  const pixelF = (pixels.length > maxRows)
    ? pixels.slice(maxRows * -1)
    : pixels;

  const columns = ['rid', 'canvas', 'coord', 'clr', 'time'];
  const types = ['number', 'cid', 'coord', 'clr', 'ts'];
  const rows = [];
  for (let i = 0; i < pixelF.length; i += 1) {
    const [cid, x, y, clr, ts] = pixelF[i];
    rows.push([
      i,
      cid,
      `${x},${y}`,
      clr,
      ts,
    ]);
  }

  return {
    columns,
    types,
    rows,
  };
}

/*
 * Get summary of users placing in area of current day
 * @param canvasId id of canvas
 * @param xUL, yUL, xBR, yBR area of canvas
 * @param time timestamp of when to start
 * @param iid Limit on one user (optional)
 * @return array of parsed pixel log lines
 *         string if error
 */
export async function getSummaryFromArea(
  canvasId,
  xUL,
  yUL,
  xBR,
  yBR,
  time,
  iid,
) {
  const ips = {};
  const uids = [];
  let filterIP = null;
  if (iid) {
    filterIP = await getIPofIID(iid);
    if (!filterIP) {
      return 'Could not resolve IID to IP';
    }
  }
  try {
    await parseFile((parts) => {
      const [tsStr, ipFull, uidStr, cid, x, y,, clrStr] = parts;
      const ts = parseInt(tsStr, 10);
      if (ts >= time
        // eslint-disable-next-line eqeqeq
        && canvasId == cid
        && x >= xUL
        && x <= xBR
        && y >= yUL
        && y <= yBR
      ) {
        const ip = getIPv6Subnet(ipFull);
        if (filterIP && ip !== filterIP) {
          return;
        }
        const clr = parseInt(clrStr, 10);
        const uid = parseInt(uidStr, 10);
        let curVals = ips[ip];
        if (!curVals) {
          curVals = [0, uid, 0, 0, 0, 0];
          ips[ip] = curVals;
          uids.push(uid);
        }
        curVals[0] += 1;
        curVals[2] = x;
        curVals[3] = y;
        curVals[4] = clr;
        curVals[5] = ts;
      }
    });
  } catch (err) {
    return `Could not parse logfile: ${err.message}`;
  }

  const uid2Name = await getNamesToIds(uids);

  const ipKeys = Object.keys(ips);
  const ip2Info = await getInfoToIps(ipKeys);

  let printIIDs = false;
  let printUsers = false;
  const columns = ['rid', '#'];
  const types = ['number', 'number'];
  if (ip2Info.size > 0) {
    printIIDs = true;
    columns.push('IID', 'ct', 'cidr', 'org', 'pc');
    types.push('uuid', 'flag', 'cidr', 'string', 'string');
  }
  if (uid2Name.size > 0) {
    printUsers = true;
    columns.push('User');
    types.push('user');
  }
  columns.push('last', 'clr', 'time');
  types.push('coord', 'clr', 'ts');

  const rows = [];
  for (let i = 0; i < ipKeys.length; i += 1) {
    const ip = ipKeys[i];
    const [pxls, uid, x, y, clr, ts] = ips[ip];
    const row = [i, pxls];
    if (printIIDs) {
      const ipInfo = ip2Info.get(ip);
      if (!ipInfo) {
        row.push('N/A', 'xx', 'N/A', 'N/A', 'N/A');
      } else {
        let { pcheck } = ipInfo;
        if (pcheck) {
          const separator = pcheck.indexOf(',');
          if (separator !== -1) {
            pcheck = pcheck.slice(0, separator);
          }
        }
        row.push(
          ipInfo.uuid,
          ipInfo.country,
          ipInfo.cidr,
          ipInfo.org || 'N/A',
          pcheck || 'N/A',
        );
      }
    }
    if (printUsers) {
      const userMd = (uid && uid2Name.has(uid))
        ? `${uid2Name.get(uid)},${uid}` : 'N/A';
      row.push(userMd);
    }
    row.push(`${x},${y}`, clr, ts);
    rows.push(row);
  }

  return {
    columns,
    types,
    rows,
  };
}


export async function getPixelsFromArea(
  canvasId,
  xUL,
  yUL,
  xBR,
  yBR,
  time,
  iid,
  maxRows = 300,
) {
  const pixels = [];
  const uids = [];
  const ips = [];
  let filterIP = null;
  if (iid) {
    filterIP = await getIPofIID(iid);
    if (!filterIP) {
      return 'Could not resolve IID to IP';
    }
  }
  try {
    await parseFile((parts) => {
      const [tsStr, ipFull, uidStr, cid, x, y,, clrStr] = parts;
      const ts = parseInt(tsStr, 10);
      if (ts >= time
        // eslint-disable-next-line eqeqeq
        && canvasId == cid
        && x >= xUL
        && x <= xBR
        && y >= yUL
        && y <= yBR
      ) {
        const ip = getIPv6Subnet(ipFull);
        if (filterIP && ip !== filterIP) {
          return;
        }
        const clr = parseInt(clrStr, 10);
        const uid = parseInt(uidStr, 10);
        pixels.push([ip, uid, x, y, clr, ts]);
        if (!ips.includes(ip)) {
          ips.push(ip);
          uids.push(uid);
        }
      }
    });
  } catch (err) {
    return `Could not parse logfile: ${err.message}`;
  }

  const uid2Name = await getNamesToIds(uids);
  const ip2Id = await getIdsToIps(ips);

  const pixelF = (pixels.length > maxRows)
    ? pixels.slice(maxRows * -1)
    : pixels;

  let printIIDs = false;
  let printUsers = false;
  const columns = ['rid'];
  const types = ['number'];
  if (!filterIP && ip2Id.size > 0) {
    printIIDs = true;
    columns.push('IID');
    types.push('uuid');
  }
  if (!filterIP && uid2Name.size > 0) {
    printUsers = true;
    columns.push('User');
    types.push('user');
  }
  columns.push('coord', 'clr', 'time');
  types.push('coord', 'clr', 'ts');

  const rows = [];
  for (let i = 0; i < pixelF.length; i += 1) {
    const [ip, uid, x, y, clr, ts] = pixelF[i];
    const row = [i];
    if (printIIDs) {
      row.push(ip2Id.get(ip) || 'N/A');
    }
    if (printUsers) {
      const userMd = (uid && uid2Name.has(uid))
        ? `${uid2Name.get(uid)},${uid}` : 'N/A';
      row.push(userMd);
    }
    row.push(`${x},${y}`, clr, ts);
    rows.push(row);
  }

  return {
    columns,
    types,
    rows,
  };
}
