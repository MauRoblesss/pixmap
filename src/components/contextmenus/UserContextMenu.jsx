/*
 *
 */

import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { t } from 'ttag';

import {
  startDm,
  setUserBlock,
} from '../../store/actions/thunks';
import { escapeMd } from '../../core/utils';

/*
 * args: {
 *   name,
 *   uid,
 *   setChannel,
 *   addToInput,
 * }
 */
const UserContextMenu = ({ args, close }) => {
  const channels = useSelector((state) => state.chat.channels);
  const fetching = useSelector((state) => state.fetching.fetchingApi);

  const dispatch = useDispatch();

  const {
    name,
    uid,
    setChannel,
    addToInput,
  } = args;

  return (
    <>
      <div
        role="button"
        key="ping"
        tabIndex={0}
        onClick={() => {
          const ping = `@[${escapeMd(name)}](${uid})`;
          addToInput(ping);
          close();
        }}
        style={{ borderTop: 'none' }}
      >
        {t`Ping`}
      </div>
      <div
        role="button"
        key="dm"
        tabIndex={0}
        onClick={() => {
          /*
           * if dm channel already exists,
           * just switch
           */
          const cids = Object.keys(channels);
          for (let i = 0; i < cids.length; i += 1) {
            const cid = cids[i];
            if (channels[cid].length === 4 && channels[cid][3] === uid) {
              setChannel(cid);
              close();
              return;
            }
          }
          if (!fetching) {
            dispatch(startDm({ userId: uid }, setChannel));
          }
          close();
        }}
      >
        {t`DM`}
      </div>
      <div
        role="button"
        key="block"
        tabIndex={-1}
        onClick={() => {
          dispatch(setUserBlock(uid, name, true));
          close();
        }}
      >
        {t`Block`}
      </div>
    </>
  );
};

export default React.memo(UserContextMenu);
