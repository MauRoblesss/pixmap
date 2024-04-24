/**
 *
 */

import React, { Suspense, useCallback, useContext } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { t } from 'ttag';

import {
  fetchStats,
} from '../../store/actions/thunks';
import WindowContext from '../context/window';
import useInterval from '../hooks/interval';
import LogInArea from '../LogInArea';
import Tabs from '../Tabs';
import UserAreaContent from '../UserAreaContent';

// eslint-disable-next-line max-len
const Rules = React.lazy(() => import(/* webpackChunkName: "rules" */ '../Rules'));
// eslint-disable-next-line max-len
const Rankings = React.lazy(() => import(/* webpackChunkName: "stats" */ '../Rankings'));
// eslint-disable-next-line max-len
const Converter = React.lazy(() => import(/* webpackChunkName: "converter" */ '../Converter'));
// eslint-disable-next-line max-len
const Modtools = React.lazy(() => import(/* webpackChunkName: "modtools" */ '../Modtools'));

const Void = React.lazy(() => import(/* webpackChunkName: "modtools" */ '../Void'));

const UserArea = () => {
  const name = useSelector((state) => state.user.name);
  const userlvl = useSelector((state) => state.user.userlvl);
  const lastStatsFetch = useSelector((state) => state.ranks.lastFetch);

  const {
    args,
    setArgs,
    setTitle,
  } = useContext(WindowContext);
  const {
    activeTab = t`Profile`,
  } = args;
  const dispatch = useDispatch();

  const setActiveTab = useCallback((label) => {
    setArgs({
      activeTab: label,
    });
    setTitle(label);
  }, [setArgs]);

  useInterval(() => {
    if (Date.now() - 300000 > lastStatsFetch) {
      dispatch(fetchStats());
    }
  }, 300000);

  return (
    <div style={{ textAlign: 'center' }}>
      <Tabs activeTab={activeTab} setActiveTab={setActiveTab}>
        <div label={t`Profile`}>
          {(name) ? <UserAreaContent /> : <LogInArea />}
        </div>
        <div label={t`Rules`}>
        <Suspense fallback={<div>Loading...</div>}>
          <Rules />
          </Suspense>
        </div>
        <div label={t`Statistics`}>
          <Suspense fallback={<div>Loading...</div>}>
            <Rankings />
          </Suspense>
        </div>
        <div label={t`Void`}>
          <Suspense fallback={<div>Loading...</div>}>
            <Void />
          </Suspense>
        </div>
        <div label={t`Converter`}>
          <Suspense fallback={<div>Loading...</div>}>
            <Converter />
          </Suspense>
        </div>
        {userlvl && (
        <div label={(userlvl === 1) ? t`Modtools` : t`Modtools`}>
          <Suspense fallback={<div>{t`Loading...`}</div>}>
            <Modtools />
          </Suspense>
        </div>
        )}
      </Tabs>
      <br />
      {t`Consider joining us on Guilded:`}&nbsp;
      <a href="./guilded" target="_blank">pixelplanet.fun/guilded</a>
      <br />
    </div>
  );
};

export default React.memo(UserArea);
