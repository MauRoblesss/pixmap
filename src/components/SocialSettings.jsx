/*
 * Change Mail Form
 */

import React from 'react';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { t } from 'ttag';

import {
  setBlockingDm,
  setPrivatize,
  setUserBlock,
} from '../store/actions/thunks';
import SettingsItem from './SettingsItem';

const selectBlocks = (state) => [
  state.chat.blocked,
  state.user.blockDm,
  state.user.priv,
  state.fetching.fetchingApi,
];

const SocialSettings = ({ done }) => {
  const [
    blocked,
    blockDm,
    priv,
    fetching,
  ] = useSelector(selectBlocks, shallowEqual);
  const dispatch = useDispatch();

  return (
    <div className="inarea">
      <SettingsItem
        title={t`Block DMs`}
        value={blockDm}
        onToggle={() => {
          if (!fetching) {
            dispatch(setBlockingDm(!blockDm));
          }
        }}
      >{t`Block all Private Messages`}</SettingsItem>
      <SettingsItem
        title={t`Private`}
        value={priv}
        onToggle={() => {
          if (!fetching) {
            dispatch(setPrivatize(!priv));
          }
        }}
      >{t`Don't show me in global stats`}</SettingsItem>
      <h3
        style={{
          textAlign: 'left',
          marginLeft: 10,
        }}
      >{t`Unblock Users`}</h3>
      {
        (blocked.length) ? (
          <span
            className="unblocklist"
          >
            {
            blocked.map((bl) => (
              <div
                key={bl[0]}
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (!fetching) {
                    dispatch(setUserBlock(bl[0], bl[1], false));
                  }
                }}
              >
                {`⦸ ${bl[1]}`}
              </div>
            ))
          }
          </span>
        )
          : (
            <p>{t`You have no users blocked`}</p>
          )
      }
      <div className="modaldivider" />
      <button
        type="button"
        onClick={done}
        style={{ margin: 10 }}
      >
        Done
      </button>
    </div>
  );
};

export default React.memo(SocialSettings);
