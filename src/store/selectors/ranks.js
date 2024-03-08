/*
 * selectors for ranks
 */

/* eslint-disable import/prefer-default-export */

export const selectStats = (state) => [
  state.ranks.totalRanking,
  state.ranks.totalDailyRanking,
  state.ranks.dailyCRanking,
  state.ranks.dailyCorRanking, 
  state.ranks.prevTop,
  state.ranks.onlineStats,
  state.ranks.cHistStats,
  state.ranks.histStats,
  state.ranks.pDailyStats,
  state.ranks.pHourlyStats,
];
