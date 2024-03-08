/**
 *
 */

import React from 'react';
import { useSelector } from 'react-redux';

import {
  durationToString,
} from '../core/utils';


const CoolDownBox = () => {
  const coolDown = useSelector((state) => state.user.coolDown);

  return (
    <div
      className={(coolDown && coolDown >= 300)
        ? 'cooldownbox show' : 'cooldownbox'}
    >
      {coolDown && durationToString(coolDown, true)}
    </div>
  );
};

export default React.memo(CoolDownBox);
