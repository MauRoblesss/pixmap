/*
 * counter for daily and total pixels and ranking
 */
import client from './client';
import { getDateKeyOfTs } from '../../core/utils';

export const RANKED_KEY = 'rank';
export const DAILY_RANKED_KEY = 'rankd';
export const DAILY_CRANKED_KEY = 'crankd';
export const DAILY_CORANKED_KEY = 'corankd';
export const PREV_DAY_TOP_KEY = 'prankd';
const DAY_STATS_RANKS_KEY = 'ds';
const CDAY_STATS_RANKS_KEY = 'cds';
const ONLINE_CNTR_KEY = 'tonl';
const PREV_HOURLY_PLACED_KEY = 'tmph';
const HOURLY_PXL_CNTR_KEY = 'thpx';
const DAILY_PXL_CNTR_KEY = 'tdpx';

/*
 * get pixelcount and ranking
 * @param userId
 * @return [ totalPixels, dailyPixels, totalRanking, dailyRanking ]
 */
export async function getUserRanks(userId) {
  const ranks = await client.getUserRanks(
    RANKED_KEY, DAILY_RANKED_KEY,
    userId,
  );
  return ranks.map((r) => Number(r));
}

/*
 * get userIds by ranks
 * @param daily integer if using daily or total score
 * @param start, amount rank to start and end
 * @return Array of objects with {userId, score, dailyScore} in given range
 */
export async function getRanks(daily, start, amount) {
  start -= 1;
  amount -= 1;
  let key;
  let valueName;
  let rankName;
  let oKey;
  let oValueName;
  let oRankName;
  if (daily) {
    key = DAILY_RANKED_KEY;
    valueName = 'dt';
    rankName = 'dr';
    oKey = RANKED_KEY;
    oValueName = 't';
    oRankName = 'r';
  } else {
    key = RANKED_KEY;
    valueName = 't';
    rankName = 'r';
    oKey = DAILY_RANKED_KEY;
    oValueName = 'dt';
    oRankName = 'dr';
  }
  /* returns { value: uid, score: pixelCnt } */
  const ranks = await client.zRangeWithScores(key, start, start + amount, {
    REV: true,
  });
  const uids = ranks.map((r) => r.value);
  if (!uids.length) {
    return uids;
  }
  const oScores = await client.zmScore(oKey, uids);
  /* impolemented with lua, which blocks :( */
  const oRanks = await client.zmRankRev(oKey, uids);
  const ret = [];
  for (let i = 0; i < ranks.length; i += 1) {
    const uob = {
      id: Number(uids[i]),
      [valueName]: ranks[i].score,
      [rankName]: i + 1,
      [oValueName]: oScores[i],
      [oRankName]: oRanks[i],
    };
    ret.push(uob);
  }
  return ret;
}

/*
 * get daily country ranking
 */
export async function getCountryRanks(start, amount) {
  start -= 1;
  amount -= 1;
  let ranks = await client.zRangeWithScores(
    DAILY_CRANKED_KEY, start, start + amount, {
      REV: true,
    });
  ranks = ranks.map((r) => ({
    cc: r.value,
    px: Number(r.score),
  }));
  return ranks;
}


/*
 * get daily cor ranking
 */
export async function getCorRanks(start, amount) {
  start -= 1;
  amount -= 1;
  let ranks = await client.zRangeWithScores(
    DAILY_CORANKED_KEY, start, start + amount, {
      REV: true,
    });
  
  ranks = ranks.map((r) => ({
    cc: r.value,
    px: Number(r.score),
  }));
  return ranks;
}

/*
 * get top 10 from previous day
 */
export async function getPrevTop() {
  let prevTop = await client.zRangeWithScores(PREV_DAY_TOP_KEY, 0, 9, {
    REV: true,
  });
  prevTop = prevTop.map((r) => ({
    id: Number(r.value),
    px: Number(r.score),
  }));
  return prevTop;
}

/*
 * store amount of online Users
 */
export async function storeOnlinUserAmount(amount) {
  await client.lPush(ONLINE_CNTR_KEY, String(amount));
  await client.lTrim(ONLINE_CNTR_KEY, 0, 7 * 24);
}

/*
 * get list of online counters per hour
 */
export async function getOnlineUserStats() {
  let onlineStats = await client.lRange(ONLINE_CNTR_KEY, 0, -1);
  onlineStats = onlineStats.map((s) => Number(s));
  return onlineStats;
}

/*
 * calculate sum of scores of zset
 * do NOT use it for large seets
 */
async function sumZSet(key) {
  const ranks = await client.zRangeWithScores(key, 0, -1);
  let total = 0;
  ranks.forEach((r) => { total += Number(r.score); });
  return total;
}

/*
 * save hourly pixels placed by substracting
 * the current daily total pixels set with the ones of an hour ago
 */
export async function storeHourlyPixelsPlaced() {
  const tsNow = Date.now();
  const prevData = await client.get(PREV_HOURLY_PLACED_KEY);
  let prevTs;
  let prevSum;
  if (prevData) {
    [prevTs, prevSum] = prevData.split(',').map((z) => Number(z));
  }

  let curSum = await sumZSet(DAILY_CRANKED_KEY);
  await client.set(PREV_HOURLY_PLACED_KEY, `${tsNow},${curSum}`);

  if (prevTs && prevTs > tsNow - 1000 * 3600 * 1.5) {
    if (prevSum > curSum) {
      // assume day change, add amount of yesterday
      const dateKey = getDateKeyOfTs(tsNow - 1000 * 3600 * 24);
      curSum += await sumZSet(`${CDAY_STATS_RANKS_KEY}:${dateKey}`);
    }
    const hourlyPixels = curSum - prevSum;
    await client.lPush(HOURLY_PXL_CNTR_KEY, String(hourlyPixels));
    await client.lTrim(HOURLY_PXL_CNTR_KEY, 0, 7 * 24);
  }
}

/*
 * get list of pixels placed per hour
 */
export async function getHourlyPixelStats() {
  let pxlStats = await client.lRange(HOURLY_PXL_CNTR_KEY, 0, -1);
  pxlStats = pxlStats.map((s) => Number(s));
  return pxlStats;
}

/*
 * get list of pixels placed per day
 */
export async function getDailyPixelStats() {
  let pxlStats = await client.lRange(DAILY_PXL_CNTR_KEY, 0, -1);
  pxlStats = pxlStats.map((s) => Number(s));
  return pxlStats;
}

/*
 * get top 10 of daily pixels over the past days
 */
export async function getTopDailyHistory() {
  const stats = [];
  const users = [];
  let ts = Date.now();
  for (let c = 0; c < 13; c += 1) {
    ts -= 1000 * 3600 * 24;
    const dateKey = getDateKeyOfTs(ts);
    const key = `${DAY_STATS_RANKS_KEY}:${dateKey}`;
    // eslint-disable-next-line no-await-in-loop
    let dData = await client.zRangeWithScores(key, 0, 9, {
      REV: true,
    });
    dData = dData.map((r) => {
      const id = Number(r.value);
      if (!users.some((q) => q.id === id)) {
        users.push({ id });
      }
      return {
        id,
        px: Number(r.score),
      };
    });
    stats.push(dData);
  }
  return {
    users,
    stats,
  };
}

/*
 * get top 10 countries over the past days
 */
export async function getCountryDailyHistory() {
  const ret = [];
  let ts;
  let key;
  for (let c = 0; c < 14; c += 1) {
    if (!ts) {
      ts = Date.now();
      key = DAILY_CRANKED_KEY;
    } else {
      ts -= 1000 * 3600 * 24;
      const dateKey = getDateKeyOfTs(ts);
      key = `${CDAY_STATS_RANKS_KEY}:${dateKey}`;
    }
    // eslint-disable-next-line no-await-in-loop
    let dData = await client.zRangeWithScores(key, 0, 9, {
      REV: true,
    });
    dData = dData.map((r) => ({
      cc: r.value,
      px: Number(r.score),
    }));
    ret.push(dData);
  }
  return ret;
}

/*
 * reset daily ranks
 * @return boolean for success
 */
export async function resetDailyRanks() {
  // store top 10
  await client.zRangeStore(PREV_DAY_TOP_KEY, DAILY_RANKED_KEY, 0, 9, {
    REV: true,
  });
  // store day
  const dateKey = getDateKeyOfTs(
    Date.now() - 1000 * 3600 * 24,
  );
  // daily user rank
  await client.rename(
    DAILY_RANKED_KEY,
    `${DAY_STATS_RANKS_KEY}:${dateKey}`,
  );
  // daily country rank
  await client.rename(
    DAILY_CRANKED_KEY,
    `${CDAY_STATS_RANKS_KEY}:${dateKey}`,
  );
  // daily pixel counter
  const sum = await sumZSet(`${CDAY_STATS_RANKS_KEY}:${dateKey}`);
  await client.lPush(DAILY_PXL_CNTR_KEY, String(sum));
  await client.lTrim(DAILY_PXL_CNTR_KEY, 0, 28);
  // purge old data
  const purgeDateKey = getDateKeyOfTs(
    Date.now() - 1000 * 3600 * 24 * 21,
  );
  await client.del(`${DAY_STATS_RANKS_KEY}:${purgeDateKey}`);
  await client.del(`${CDAY_STATS_RANKS_KEY}:${purgeDateKey}`);
}
