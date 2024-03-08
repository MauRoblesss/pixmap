/*
 * get information from ip
 */

import net from 'net';

import { isIPv6, ip4InRangeToCIDR } from './ip';
import { OUTGOING_ADDRESS } from '../core/config';

const WHOIS_PORT = 43;
const QUERY_SUFFIX = '\r\n';
const WHOIS_TIMEOUT = 30000;

/*
 * parse whois return into fields
 */
function parseSimpleWhois(whois) {
  let data = {
    groups: {},
  };

  const groups = [{}];
  const text = [];
  const lines = whois.split('\n');
  let lastLabel;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (line.startsWith('%') || line.startsWith('#')) {
      /*
       * detect if an ASN or IP has multiple WHOIS results,
       * and only care about first one
       */
      if (line.includes('# end')) {
        break;
      } else if (!lines.includes('# start')) {
        text.push(line);
      }
      continue;
    }
    if (line) {
      const sep = line.indexOf(':');
      if (~sep) {
        const label = line.slice(0, sep).toLowerCase();
        lastLabel = label;
        const value = line.slice(sep + 1).trim();
        // 1) Filter out unnecessary info, 2) then detect if the label is already added to group
        if (value.includes('---')) {
          // do nothing with useless data
        } else if (groups[groups.length - 1][label]) {
          groups[groups.length - 1][label] += `\n${value}`;
        } else {
          groups[groups.length - 1][label] = value;
        }
      } else {
        groups[groups.length - 1][lastLabel] += `\n${line}`;
      }
    } else if (Object.keys(groups[groups.length - 1]).length) {
      // if empty line, means another info group starts
      groups.push({});
    }
  }

  groups.forEach((group) => {
    if (group.role) {
      const role = group.role.replaceAll(' ', '-').toLowerCase();
      delete group.role;
      data.groups[role] = group;
    } else {
      data = {
        ...group,
        ...data,
      };
    }
  });

  data.text = text.join('\n');

  return data;
}

/*
 * parse whois return
 * @param ip ip string
 * @param whois whois return
 * @return object with whois data
 */
function parseWhois(ip, whoisReturn) {
  const whoisData = parseSimpleWhois(whoisReturn);

  let cidr;
  if (isIPv6(ip)) {
    const range = whoisData.inet6num || whoisData.netrange || whoisData.inetnum
      || whoisData.route || whoisData.cidr;
    cidr = range && !range.includes('-') && range;
  } else {
    const range = whoisData.inetnum || whoisData.netrange
      || whoisData.route || whoisData.cidr;
    if (range) {
      if (range.includes('/') && !range.includes('-')) {
        cidr = range;
      } else {
        cidr = ip4InRangeToCIDR(ip, range);
      }
    }
  }

  let org = whoisData['org-name']
    || whoisData.organization
    || whoisData.orgname
    || whoisData.descr
    || whoisData['mnt-by'];
  if (!org) {
    const contactGroup = Object.keys(whoisData.groups).find(
      (g) => whoisData.groups[g].address,
    );
    if (contactGroup) {
      [org] = whoisData.groups[contactGroup].address.split('\n');
    } else {
      org = whoisData.owner || whoisData['mnt-by'] || 'N/A';
    }
  }
  const descr = whoisData.netname || whoisData.descr || 'N/A';
  const asn = whoisData.asn
    || whoisData.origin
    || whoisData.originas
    || whoisData['aut-num'] || 'N/A';
  let country = whoisData.country
    || (whoisData.organisation && whoisData.organisation.Country)
    || 'xx';
  if (country.length > 2) {
    country = country.slice(0, 2);
  }

  return {
    ip,
    cidr: cidr || 'N/A',
    org,
    country,
    asn,
    descr,
  };
}

/*
 * send a raw whois query to server
 * @param query
 * @param host
 */
function singleWhoisQuery(
  query,
  host,
) {
  if (host.endsWith(':4321')) {
    throw new Error('no rwhois support');
  }
  return new Promise((resolve, reject) => {
    let data = '';
    const socket = net.createConnection({
      host,
      port: WHOIS_PORT,
      localAddress: OUTGOING_ADDRESS,
      family: 4,
      timeout: WHOIS_TIMEOUT,
    }, () => socket.write(query + QUERY_SUFFIX));
    socket.on('data', (chunk) => { data += chunk; });
    socket.on('close', () => resolve(data));
    socket.on('timeout', () => socket.destroy(new Error('Timeout')));
    socket.on('error', reject);
  });
}

/*
 * check if whois result is referring us to
 * a different whois server
 */
const referralKeys = [
  'whois:',
  'refer:',
  'ReferralServer:',
];
function checkForReferral(
  whoisResult,
) {
  for (let u = 0; u < referralKeys.length; u += 1) {
    const key = referralKeys[u];
    const pos = whoisResult.indexOf(key);
    if (~pos) {
      const line = whoisResult.slice(
        whoisResult.lastIndexOf('\n', pos) + 1,
        whoisResult.indexOf('\n', pos),
      ).trim();
      if (!line.startsWith(key)) {
        continue;
      }
      let value = line.slice(line.indexOf(':') + 1).trim();
      const prot = value.indexOf('://');
      if (~prot) {
        value = value.slice(prot + 3);
      }
      return value;
    }
  }
  return null;
}

/*
 * whois ip
 */
export default async function whoisIp(
  ip,
  host = null,
) {
  let useHost;
  if (!host) {
    if (Math.random() > 0.5) {
      useHost = 'whois.arin.net';
    } else {
      useHost = 'whois.iana.org';
    }
  } else {
    useHost = host;
  }
  let whoisResult = '';
  let refCnt = 0;
  while (refCnt < 5) {
    let queryPrefix = '';
    if (useHost === 'whois.arin.net') {
      queryPrefix = '+ n';
    } else if (useHost === 'whois.ripe.net') {
      /*
       * flag to not return personal information, otherwise
       * RIPE is gonna rate limit and ban
       */
      queryPrefix = '-r';
    }

    try {
      // eslint-disable-next-line no-await-in-loop
      whoisResult = await singleWhoisQuery(`${queryPrefix} ${ip}`, useHost);
      const ref = checkForReferral(whoisResult);
      if (!ref) {
        break;
      }
      useHost = ref;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`Error on WHOIS ${ip} ${useHost}: ${err.message}`);
      break;
    }
    refCnt += 1;
  }
  return parseWhois(ip, whoisResult);
}
