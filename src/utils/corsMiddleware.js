/*
 * set CORS Headers
 */
import { CORS_HOSTS } from '../core/config';

export default (req, res, next) => {
  if (!CORS_HOSTS || !req.headers.origin) {
    next();
    return;
  }
  const { origin } = req.headers;

  const host = origin.slice(origin.indexOf('//') + 2);
  /*
   * form .domain.tld will accept both domain.tld and x.domain.tld
   */
  const isAllowed = CORS_HOSTS.some((c) => c === host
    || (c.startsWith('.') && (host.endsWith(c) || host === c.slice(1))));

  if (!isAllowed) {
    next();
    return;
  }

  res.set({
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
  });

  if (req.method === 'OPTIONS') {
    res.set({
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST',
    });
    res.sendStatus(200);
    return;
  }
  next();
};
