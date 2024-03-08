/**
 *
 */

import React from 'react';
import { useSelector, shallowEqual } from 'react-redux';

import CoolDownBox from './CoolDownBox';
import NotifyBox from './NotifyBox';
import GlobeButton from './buttons/GlobeButton';
import PalselButton from './buttons/PalselButton';
import Palette from './Palette';
import Alert from './Alert';
import HistorySelect from './HistorySelect';
import Mobile3DControls from './Mobile3DControls';

const UI = () => {
  const [
    isHistoricalView,
    is3D,
    isOnMobile,
  ] = useSelector((state) => [
    state.canvas.isHistoricalView,
    state.canvas.is3D,
    state.user.isOnMobile,
  ], shallowEqual);

  return (
    <>
      <Alert />
      {(isHistoricalView) ? (
        <HistorySelect />
      ) : (
        <>
          <PalselButton />
          <Palette />
          {(!is3D) && <GlobeButton />}
          {(is3D && isOnMobile) && <Mobile3DControls />}
          <CoolDownBox />
        </>
      )}
      <NotifyBox />
    </>
  );
};

export default React.memo(UI);
