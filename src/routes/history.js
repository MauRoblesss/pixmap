import fs from 'fs';

import { BACKUP_DIR } from '../core/config';

async function history(req, res) {
  const { day, id } = req.query;
  if (!BACKUP_DIR || !day || !id
      || day.includes('/') || day.includes('\\') || day.length !== 8
  ) {
    res.status(404).end();
    return;
  }
  const yyyy = day.slice(0, 4);
  const mm = day.slice(4, 6);
  const dd = day.slice(6);
  const path = `${BACKUP_DIR}/${yyyy}/${mm}/${dd}/${id}`;

  try {
    if (!fs.existsSync(path)) {
      res.status(404).end();
      return;
    }

    const dirs = fs.readdirSync(path);
    const filteredDir = dirs.filter((item) => item !== 'tiles');
    res.set({
      'Cache-Control': `public, max-age=${60 * 60}`, // seconds
    });
    res.json(filteredDir);
  } catch {
    res.status(404).end();
  }
}

export default history;
