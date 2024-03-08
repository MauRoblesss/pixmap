
const initialState = {
  lastFetch: 0,
  totalPixels: 0,
  dailyTotalPixels: 0,
  ranking: 1488,
  dailyRanking: 1488,
  // global stats
  /*
   * {
   *   total: totalUsersOnline,
   *   canvasId: onlineAtCanvas,
   * }
   */
  online: {
    total: 0,
  },
  totalRanking: [],
  totalDailyRanking: [],
  dailyCRanking: [],
  dailyCorRanking: [],
  prevTop: [],
  onlineStats: [],
  cHistStats: [],
  histStats: { users: [], stats: [] },
  pDailyStats: [],
  pHourlyStats: [],
};

export default function ranks(
  state = initialState,
  action,
) {
  switch (action.type) {
    case 'REC_SET_PXLS': {
      const {
        rankedPxlCnt,
      } = action;
      if (!rankedPxlCnt) {
        return state;
      }
      let { totalPixels, dailyTotalPixels } = state;
      totalPixels += rankedPxlCnt;
      dailyTotalPixels += rankedPxlCnt;
      return {
        ...state,
        totalPixels,
        dailyTotalPixels,
      };
    }

    case 'REC_ONLINE': {
      const { online } = action;
      return {
        ...state,
        online,
      };
    }

    case 's/REC_ME':
    case 's/LOGIN': {
      if (!action.totalPixels) {
        return state;
      }
      const {
        totalPixels,
        dailyTotalPixels,
        ranking,
        dailyRanking,
      } = action;
      return {
        ...state,
        totalPixels,
        dailyTotalPixels,
        ranking,
        dailyRanking,
      };
    }

    case 'REC_STATS': {
      const {
        totalRanking,
        totalDailyRanking,
        dailyCRanking,
        dailyCorRanking,
        prevTop,
        onlineStats,
        cHistStats,
        histStats,
        pDailyStats,
        pHourlyStats,
      } = action;
      const newStats = {
        totalRanking,
        totalDailyRanking,
        dailyCRanking,
        dailyCorRanking,
        prevTop,
        onlineStats,
        cHistStats,
        histStats,
        pDailyStats,
        pHourlyStats,
      };
      const lastFetch = Date.now();
      return {
        ...state,
        lastFetch,
        ...newStats,
      };
    }

    default:
      return state;
  }
}
