/*
 * Rankings Tabs
 */

/* eslint-disable max-len */

import React, { useState, useMemo } from 'react';
import { shallowEqual, useSelector } from 'react-redux';
import { t } from 'ttag';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  LineController,
  ArcElement,
} from 'chart.js';
import { Line, Pie } from 'react-chartjs-2';

import { selectIsDarkMode } from '../store/selectors/gui';
import { selectStats } from '../store/selectors/ranks';
import {
  getCHistChartOpts,
  getCHistChartData,
  getOnlineStatsOpts,
  getOnlineStatsData,
  getHistChartOpts,
  getHistChartData,
  getCPieOpts,
  getCPieData,
  getPDailyStatsOpts,
  getPDailyStatsData,
  getCorPieOpts,
  getCorPieData,
} from '../core/chartSettings';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  LineController,
  // for pie chart
  ArcElement,
);

const Rankings = () => {
  const [area, setArea] = useState('total');
  const [
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
  ] = useSelector(selectStats, shallowEqual);
  const isDarkMode = useSelector(selectIsDarkMode);

  const cHistData = useMemo(() => {
    if (area !== 'charts') {
      return null;
    }
    return getCHistChartData(cHistStats);
  }, [area, cHistStats]);

  const cHistOpts = useMemo(() => {
    if (area !== 'charts') {
      return null;
    }
    return getCHistChartOpts(isDarkMode);
  }, [area, isDarkMode]);

  const onlineData = useMemo(() => {
    if (area !== 'charts') {
      return null;
    }
    return getOnlineStatsData(onlineStats, pHourlyStats);
  }, [area, onlineStats]);

  const onlineOpts = useMemo(() => {
    if (area !== 'charts') {
      return null;
    }
    return getOnlineStatsOpts(isDarkMode);
  }, [area, isDarkMode]);

  const histData = useMemo(() => {
    if (area !== 'charts') {
      return null;
    }
    return getHistChartData(histStats);
  }, [area, histStats]);

  const histOpts = useMemo(() => {
    if (area !== 'charts') {
      return null;
    }
    return getHistChartOpts(isDarkMode);
  }, [area, isDarkMode]);

  const pDailyData = useMemo(() => {
    if (area !== 'charts') {
      return null;
    }
    return getPDailyStatsData(pDailyStats);
  }, [area, pDailyStats]);

  const pDailyOpts = useMemo(() => {
    if (area !== 'charts') {
      return null;
    }
    return getPDailyStatsOpts(isDarkMode);
  }, [area, isDarkMode]);

  const cPieData = useMemo(() => {
    if (area !== 'countries') {
      return null;
    }
    return getCPieData(dailyCRanking);
  }, [area, dailyCRanking]);

  const cPieOpts = useMemo(() => {
    if (area !== 'countries') {
      return null;
    }
    return getCPieOpts(isDarkMode);
  }, [area, isDarkMode]);

  const corPieData = useMemo(() => {
    if (area !== 'colors') {
      return null;
    }
    return getCorPieData(dailyCorRanking);
  }, [area, dailyCorRanking]);

  const corPieOpts = useMemo(() => {
    if (area !== 'colors') {
      return null;
    }
    return getCorPieOpts(isDarkMode);
  }, [area, isDarkMode]);

  return (
    <>
      <div className="content">
        <span
          role="button"
          tabIndex={-1}
          className={
            (area === 'total') ? 'modallink selected' : 'modallink'
          }
          onClick={() => setArea('total')}
        > {t`Total`}</span>
        <span className="hdivider" />
        <span
          role="button"
          tabIndex={-1}
          className={
            (area === 'today') ? 'modallink selected' : 'modallink'
          }
          onClick={() => setArea('today')}
        > {t`Today`}</span>
        <span className="hdivider" />
        <span
          role="button"
          tabIndex={-1}
          className={
            (area === 'yesterday') ? 'modallink selected' : 'modallink'
          }
          onClick={() => setArea('yesterday')}
        > {t`Yesterday`}</span>
        <span className="hdivider" />
        <span
          role="button"
          tabIndex={-1}
          className={
            (area === 'countries') ? 'modallink selected' : 'modallink'
          }
          onClick={() => setArea('countries')}
        > {t`Countries Today`}</span>
        <span className="hdivider" />

        <span
          role="button"
          tabIndex={-1}
          className={
            (area === 'colors') ? 'modallink selected' : 'modallink'
          }
          onClick={() => setArea('colors')}
        > {t`Colors Today`}</span>
        <span className="hdivider" />
        <span
          role="button"
          tabIndex={-1}
          className={
            (area === 'charts') ? 'modallink selected' : 'modallink'
          }
          onClick={() => setArea('charts')}
        > {t`Charts`}</span>
      </div>
      <br />
      {(area === 'countries') && (
        <div style={{ height: 300, paddingBottom: 16 }}>
          <Pie options={cPieOpts} data={cPieData} />
        </div>
      )}
      {(area === 'colors') && (
        <div style={{ height: 300, paddingBottom: 16 }}>
          <Pie options={corPieOpts} data={corPieData} />
        </div>
      )}
      {(['total', 'today', 'yesterday', 'countries','colors'].includes(area)) && (
        <table style={{
          display: 'inline',
        }}
        >
          <thead>
            {{
              total: (
                <tr>
                  <th>#</th>
                  <th>{t`User`}</th>
                  <th>Pixels</th>
                  <th># Today</th>
                  <th>Pixels Today</th>
                </tr>
              ),
              today: (
                <tr>
                  <th>#</th>
                  <th>{t`User`}</th>
                  <th>Pixels</th>
                  <th># Total</th>
                  <th>Total Pixels</th>
                </tr>
              ),
              yesterday: (
                <tr>
                  <th>#</th>
                  <th>{t`User`}</th>
                  <th>Pixels</th>
                </tr>
              ),
              countries: (
                <tr>
                  <th>#</th>
                  <th>{t`Country`}</th>
                  <th>Pixels</th>
                </tr>
              ),
              colors: (
                <tr>
                  <th>#</th>
                  <th>{t`Color`}</th>
                  <th>Pixels</th>
                </tr>
              ),
            }[area]}
          </thead>
          <tbody>
            {{
              total: totalRanking.map((rank) => (
                <tr key={rank.name}>
                  <td>{rank.r}</td>
                  <td><span>{rank.name}</span></td>
                  <td>{rank.t}</td>
                  <td>{rank.dr}</td>
                  <td>{rank.dt}</td>
                </tr>
              )),
              today: totalDailyRanking.map((rank) => (
                <tr key={rank.name}>
                  <td>{rank.dr}</td>
                  <td><span>{rank.name}</span></td>
                  <td>{rank.dt}</td>
                  <td>{rank.r}</td>
                  <td>{rank.t}</td>
                </tr>
              )),
              yesterday: prevTop.map((rank, ind) => (
                <tr key={rank.name}>
                  <td>{ind + 1}</td>
                  <td><span>{rank.name}</span></td>
                  <td>{rank.px}</td>
                </tr>
              )),
              countries: dailyCRanking.map((rank, ind) => (
                <tr key={rank.name}>
                  <td>{ind + 1}</td>
                  <td title={rank.cc}><img
                    style={{
                      height: '1em',
                      imageRendering: 'crisp-edges',
                    }}
                    alt={rank.cc}
                    src={`/cf/${rank.cc}.gif`}
                  /></td>
                  <td>{rank.px}</td>
                </tr>
              )),
              colors: dailyCorRanking.map((rank, ind) => (
                <tr key={rank.name}>
                  <td  style={{ textAlign: 'center', }}>{ind + 1} °</td>
                  <td style={{ textAlign: 'center', }} title={rank.cc}>
                    <div className='pixelColor' style={{ backgroundColor: "rgb(" + `${rank.cc})`  }} ></div>
                  </td>
                  <td>{rank.px}</td>
                </tr>
              )),
            }[area]}
          </tbody>
        </table>
      )}
      {(area === 'charts') && (
        <>
          <Line options={cHistOpts} data={cHistData} />
          <Line options={onlineOpts} data={onlineData} />
          <Line options={pDailyOpts} data={pDailyData} />
          <Line options={histOpts} data={histData} />
        </>
      )}
      <p>
        {t`Ranking updates every 5 min. Daily rankings get reset at midnight UTC.`}
      </p>
    </>
  );
};

export default React.memo(Rankings);
