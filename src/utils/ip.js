/**
 *
 * basic functions to get data from headers and parse IPs
 */

import { USE_XREALIP } from '../core/config';

/*
 * Parse ip4 string to 32bit integer
 * @param ipString ip string
 * @return ipNum numerical ip
 */
function ip4ToNum(ipString) {
  if (!ipString) {
    return null;
  }
  const ipArr = ipString
    .trim()
    .split('.')
    .map((numString) => parseInt(numString, 10));
  if (ipArr.length !== 4 || ipArr.some(
    (num) => Number.isNaN(num) || num > 255 || num < 0,
  )) {
    return null;
  }
  return (ipArr[0] << 24)
    + (ipArr[1] << 16)
    + (ipArr[2] << 8)
    + ipArr[3];
}

/*
 * Parse ip4 number to string representation
 * @param ipNum numerical ip (32bit integer)
 * @return ipString string representation of ip (xxx.xxx.xxx.xxx)
 */
function ip4NumToStr(ipNum) {
  return [
    ipNum >>> 24,
    ipNum >>> 16 & 0xFF,
    ipNum >>> 8 & 0xFF,
    ipNum & 0xFF,
  ].join('.');
}

/*
 * Get hostname from request
 * @param req express req object
 * @param includeProto if we include protocol (https, http)
 * @return host (like pixelplanet.fun)
 */
export function getHostFromRequest(req, includeProto = true, stripSub = false) {
  const { headers } = req;
  let host = headers['x-forwarded-host']
    || headers[':authority']
    || headers.host;
  if (stripSub) {
    if (host.lastIndexOf('.') !== host.indexOf('.')) {
      host = host.slice(host.indexOf('.'));
    } else {
      host = `.${host}`;
    }
  }
  if (!includeProto) {
    return host;
  }

  const proto = headers['x-forwarded-proto'] || 'http';
  return `${proto}://${host}`;
}

/*
 * Get IP from request
 * @param req express req object
 * @return ip as string
 */
export function getIPFromRequest(req) {
  if (USE_XREALIP) {
    const ip = req.headers['x-real-ip'];
    if (ip) {
      return ip;
    }
  }

  const { socket, connection } = req;
  let conip = (connection ? connection.remoteAddress : socket.remoteAddress);
  conip = conip || '0.0.0.1';
  if (!USE_XREALIP) {
    // eslint-disable-next-line no-console
    console.warn(
      `Connection not going through reverse proxy! IP: ${conip}`, req.headers,
    );
  }
  return conip;
}

/*
 * Check if IP is v6 or v4
 * @param ip ip as string
 * @return true if ipv6, false otherwise
 */
export function isIPv6(ip) {
  return ip.includes(':');
}

/*
 * Set last digits of IPv6 to zero,
 * needed because IPv6 assigns subnets to customers, we don't want to
 * mess with individual ips
 * @param ip ip as string (v4 or v6)
 * @return ip as string, and if v6, the last digits set to 0
 */
export function getIPv6Subnet(ip) {
  if (isIPv6(ip)) {
    // eslint-disable-next-line max-len
    return `${ip.split(':')
      .slice(0, 4)
      .join(':')}:0000:0000:0000:0000`;
  }
  return ip;
}

/*
 * Get numerical start and end of range
 * @param range string of range in the format 'xxx.xxx.xxx.xxx - xxx.xxx.xxx.xxx'
 * @return [start, end] with numerical IPs (32bit integer)
 */
function ip4RangeStrToRangeNum(range) {
  if (!range) {
    return null;
  }
  const [start, end] = range.split('-')
    .map(ip4ToNum);
  if (!start || !end || start > end) {
    return null;
  }
  return [start, end];
}

/*
 * Get Array of CIDRs for an numerical IPv4 range
 * @param [start, end] with numerical IPs (32bit integer)
 * @return Array of CIDR strings
 */
function ip4RangeNumToCIDR([start, end]) {
  let maskNum = 32;
  let mask = 0xFFFFFFFF;
  const diff = start ^ end;
  while (diff & mask) {
    mask <<= 1;
    maskNum -= 1;
  }
  if ((start & (~mask)) || (~(end | mask))) {
    const divider = start | (~mask >> 1);
    return ip4RangeNumToCIDR([start, divider]).concat(
      ip4RangeNumToCIDR([divider + 1, end]),
    );
  }
  return [`${ip4NumToStr(start)}/${maskNum}`];
}

/*
 * Get Array of CIDRs for an IPv4 range
 * @param range string of range in the format 'xxx.xxx.xxx.xxx - xxx.xxx.xxx.xxx'
 * @return Array of CIDR strings
 */
export function ip4RangeToCIDR(range) {
  const rangeNum = ip4RangeStrToRangeNum(range);
  if (!rangeNum) {
    return null;
  }
  return ip4RangeNumToCIDR(rangeNum);
}

/*
 * Get specific CIDR in numeric range that includes numeric ip
 * @param ip numerical ip (32bit integer)
 * @param [start, end] with numerical IPs (32bit integer)
 * @return CIDR string
 */
function ip4NumInRangeNumToCIDR(ip, [start, end]) {
  let maskNum = 32;
  let mask = 0xFFFFFFFF;
  const diff = start ^ end;
  while (diff & mask) {
    mask <<= 1;
    maskNum -= 1;
  }
  if ((start & (~mask)) || (~(end | mask))) {
    const divider = start | (~mask >> 1);
    if (ip <= divider) {
      return ip4NumInRangeNumToCIDR(ip, [start, divider]);
    }
    return ip4NumInRangeNumToCIDR(ip, [divider + 1, end]);
  }
  return `${ip4NumToStr(start)}/${maskNum}`;
}

/*
 * Get specific CIDR in range that includes ip
 * @param ip ip string ('xxx.xxx.xxx.xxx')
 * @param range string ('xxx.xxx.xxx.xxx - xxx.xxx.xxx.xxx')
 * @return CIDR string
 */
export function ip4InRangeToCIDR(ip, range) {
  const rangeNum = ip4RangeStrToRangeNum(range);
  const ipNum = ip4ToNum(ip);
  if (!ipNum || !rangeNum || rangeNum[0] > ip || rangeNum[1] < ip) {
    return null;
  }
  return ip4NumInRangeNumToCIDR(ipNum, rangeNum);
}
