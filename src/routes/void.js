/*
 * send information about next void
 */

import rpgEvent from '../core/RpgEvent';

export default (req, res) => {
  res.set({
    'Cache-Control': `public, max-age=${5 * 60}`,
  });

  if (rpgEvent.eventTimestamp) {
    const time = new Date(rpgEvent.eventTimestamp);
    res.send(`Next void at ${time.toUTCString()}`);
  } else {
    res.send('No void');
  }
};
