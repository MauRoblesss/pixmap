import { t } from 'ttag';
import { colorFromText } from './utils';

export function getCHistChartOpts(isDarkMode) {
  const options = {
    responsive: true,
    aspectRatio: 1.4,
    scales: {
      x: {
        grid: {
          drawBorder: false,
        },
      },
      y: {
        grid: {
          drawBorder: false,
        },
      },
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: t`Top 10 Countries [pxls / day]`,
      },
    },
  };
  if (isDarkMode) {
    const sColor = '#e6e6e6';
    const lColor = '#656565';
    options.color = sColor;
    options.scales.x.ticks = {
      color: sColor,
    };
    options.scales.x.grid.color = lColor;
    options.scales.y.ticks = {
      color: sColor,
    };
    options.scales.y.grid.color = lColor;
    options.plugins.title.color = sColor;
  }
  return options;
}

export function getCHistChartData(cHistStats) {
  const dataPerCountry = {};
  const labels = [];
  let ts = Date.now();
  let c = cHistStats.length;
  while (c) {
    const dAmount = cHistStats.length - c;
    c -= 1;
    // x label
    const date = new Date(ts);
    labels.unshift(`${date.getUTCMonth() + 1} / ${date.getUTCDate()}`);
    ts -= 1000 * 3600 * 24;
    // y data per country
    const dailyRanks = cHistStats[c];
    for (let i = 0; i < dailyRanks.length; i += 1) {
      const { cc, px } = dailyRanks[i];
      if (!dataPerCountry[cc]) {
        dataPerCountry[cc] = [];
      }
      const countryDat = dataPerCountry[cc];
      while (countryDat.length < dAmount) {
        countryDat.push(null);
      }
      countryDat.push(px);
    }
  }
  const countries = Object.keys(dataPerCountry);
  const datasets = countries.map((cc) => {
    const color = colorFromText(`${cc}${cc}${cc}${cc}${cc}`);
    return {
      label: cc,
      data: dataPerCountry[cc],
      borderColor: color,
      backgroundColor: color,
    };
  });
  return {
    labels,
    datasets,
  };
}

export function getOnlineStatsOpts(isDarkMode) {
  const options = {
    responsive: true,
    scales: {
      x: {
        grid: {
          drawBorder: false,
        },
      },
      A: {
        type: 'linear',
        position: 'left',
        grid: {
          drawBorder: false,
        },
      },
      B: {
        type: 'linear',
        position: 'right',
        grid: {
          drawBorder: false,
        },
      },
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: t`Players and Pixels per hour`,
      },
    },
  };
  if (isDarkMode) {
    const sColor = '#e6e6e6';
    const lColor = '#656565';
    options.color = sColor;
    options.scales.x.ticks = {
      color: sColor,
    };
    options.scales.x.grid.color = lColor;
    options.scales.A.ticks = {
      color: sColor,
    };
    options.scales.A.grid.color = lColor;
    options.scales.B.ticks = {
      color: sColor,
    };
    options.scales.B.grid.color = lColor;
    options.plugins.title.color = sColor;
  }
  return options;
}

export function getOnlineStatsData(onlineStats, pHourlyStats) {
  const labels = [];
  const onData = [];
  const pxlData = [];
  let ts = Date.now();
  let c = Math.max(onlineStats.length, pHourlyStats.length);
  while (c) {
    c -= 1;
    const date = new Date(ts);
    const hours = date.getHours();
    const key = hours || `${date.getMonth() + 1} / ${date.getDate()}`;
    labels.unshift(String(key));
    ts -= 1000 * 3600;
    if (onlineStats.length > c) {
      onData.push(onlineStats[c]);
    } else {
      onData.push(null);
    }
    if (pHourlyStats.length > c) {
      pxlData.push(pHourlyStats[c]);
    } else {
      pxlData.push(null);
    }
  }
  return {
    labels,
    datasets: [{
      yAxisID: 'A',
      label: 'Players',
      data: onData,
      borderColor: '#3fadda',
      backgroundColor: '#3fadda',
    }, {
      yAxisID: 'B',
      label: 'Pixels',
      data: pxlData,
      borderColor: '#d067b6',
      backgroundColor: '#d067b6',
    }],
  };
}

export function getHistChartOpts(isDarkMode) {
  const options = {
    responsive: true,
    aspectRatio: 1.5,
    scales: {
      x: {
        grid: {
          drawBorder: false,
        },
      },
      y: {
        grid: {
          drawBorder: false,
        },
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'xy',
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: t`Top 10 Players [pxls / day]`,
      },
    },
  };
  if (isDarkMode) {
    const sColor = '#e6e6e6';
    const lColor = '#656565';
    options.color = sColor;
    options.scales.x.ticks = {
      color: sColor,
    };
    options.scales.x.grid.color = lColor;
    options.scales.y.ticks = {
      color: sColor,
    };
    options.scales.y.grid.color = lColor;
    options.plugins.title.color = sColor;
  }
  return options;
}

export function getHistChartData(histStats) {
  const { users, stats } = histStats;
  const dataPerUser = {};
  users.forEach((u) => { dataPerUser[u.id] = { name: u.name, data: [] }; });
  const labels = [];
  let ts = Date.now();
  let c = stats.length;
  while (c) {
    const dAmount = stats.length - c;
    c -= 1;
    // x label
    ts -= 1000 * 3600 * 24;
    const date = new Date(ts);
    labels.unshift(`${date.getUTCMonth() + 1} / ${date.getUTCDate()}`);
    // y data per user
    const dailyRanks = stats[c];
    for (let i = 0; i < dailyRanks.length; i += 1) {
      const { id, px } = dailyRanks[i];
      const userDat = dataPerUser[id].data;
      while (userDat.length < dAmount) {
        userDat.push(null);
      }
      userDat.push(px);
    }
  }
  const userIds = Object.keys(dataPerUser);
  const datasets = userIds.map((id) => {
    const { name, data } = dataPerUser[id];
    const color = colorFromText(name);
    return {
      label: name,
      data,
      borderColor: color,
      backgroundColor: color,
    };
  });
  return {
    labels,
    datasets,
  };
}

export function getCPieOpts(isDarkMode) {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: t`Countries by Pixels Today`,
      },
    },
  };
  if (isDarkMode) {
    options.plugins.title.color = '#e6e6e6';
  }
  return options;
}

export function getCPieData(dailyCRanking) {
  const labels = [];
  const data = [];
  const backgroundColor = [];
  dailyCRanking.forEach((r) => {
    const { cc, px } = r;
    labels.push(cc);
    data.push(px);
    const color = colorFromText(`${cc}${cc}${cc}${cc}${cc}`);
    backgroundColor.push(color);
  });
  return {
    labels,
    datasets: [{
      label: '# of Pixels',
      data,
      backgroundColor,
      borderWidth: 1,
    }],
  };
}

export function getPDailyStatsOpts(isDarkMode) {
  const options = {
    responsive: true,
    scales: {
      x: {
        grid: {
          drawBorder: false,
        },
      },
      y: {
        grid: {
          drawBorder: false,
        },
      },
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: t`Total Pixels placed per day`,
      },
    },
  };
  if (isDarkMode) {
    const sColor = '#e6e6e6';
    const lColor = '#656565';
    options.color = sColor;
    options.scales.x.ticks = {
      color: sColor,
    };
    options.scales.x.grid.color = lColor;
    options.scales.y.ticks = {
      color: sColor,
    };
    options.scales.y.grid.color = lColor;
    options.plugins.title.color = sColor;
  }
  return options;
}

export function getPDailyStatsData(pDailyStats) {
  const labels = [];
  const data = [];
  let ts = Date.now();
  let c = pDailyStats.length;
  while (c) {
    c -= 1;
    ts -= 1000 * 3600 * 24;
    const date = new Date(ts);
    labels.unshift(`${date.getUTCMonth() + 1} / ${date.getUTCDate()}`);
    data.push(pDailyStats[c]);
  }
  return {
    labels,
    datasets: [{
      label: 'Pixels',
      data,
      borderColor: '#3fadda',
      backgroundColor: '#3fadda',
    }],
  };
}


export function getCorPieOpts(isDarkMode) {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: t`Earth Colors by Pixels Today`,
      },
    },
  };
  if (isDarkMode) {
    options.plugins.title.color = '#e6e6e6';
  }
  return options;
}


export function getCorPieData(dailyCRanking) {
  const labels = [];
  const data = [];
  const backgroundColor = [];
  dailyCRanking.forEach((r) => {
    const { cc, px } = r;
    labels.push(cc);
    data.push(px);
    const color = `rgb(${cc})`;
    backgroundColor.push(color);
  });
  return {
    labels,
    datasets: [{
      label: '# of Pixels',
      data,
      backgroundColor,
      borderWidth: 1,
    }],
  };
}
