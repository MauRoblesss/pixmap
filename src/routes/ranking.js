/*
 * send global ranking
 */

import rankings from '../core/Ranks';

export default (req, res) => {
  res.json(rankings.ranks);
};
