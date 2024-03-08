/*
 * Admintools
 */

import React, { useState } from 'react';
import { t } from 'ttag';

import { parseInterval } from '../core/utils';
import { shardOrigin } from '../store/actions/fetch';

async function submitIIDAction(
  action,
  iid,
  reason,
  duration,
  callback,
) {
  let time = parseInterval(duration);
  if (time === 0 && duration !== '0') {
    callback(t`You must enter a duration`);
    return;
  }
  if (!iid) {
    callback(t`You must enter an IID`);
    return;
  }
  if (time > 0) {
    time += Date.now();
  }
  const data = new FormData();
  data.append('iidaction', action);
  data.append('reason', reason);
  data.append('time', time);
  data.append('iid', iid);
  const resp = await fetch(`${shardOrigin}/api/modtools`, {
    credentials: 'include',
    method: 'POST',
    body: data,
  });
  callback(await resp.text());
}

function ModIIDtools() {
  const [iIDAction, selectIIDAction] = useState('givecaptcha');
  const [iid, selectIid] = useState('');
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('1d');
  const [resp, setResp] = useState('');
  const [submitting, setSubmitting] = useState(false);

  return (
    <div style={{ textAlign: 'center', paddingLeft: '5%', paddingRight: '5%' }}>
      <h3>{t`IID Actions`}</h3>
      <select
        value={iIDAction}
        onChange={(e) => {
          const sel = e.target;
          selectIIDAction(sel.options[sel.selectedIndex].value);
        }}
      >
        {['status', 'givecaptcha', 'ban', 'unban', 'whitelist', 'unwhitelist']
          .map((opt) => (
            <option
              key={opt}
              value={opt}
            >
              {opt}
            </option>
          ))}
      </select>
      {(iIDAction === 'ban') && (
        <React.Fragment key="ban">
          <p>{t`Reason`}</p>
          <input
            maxLength="200"
            style={{
              width: '100%',
            }}
            value={reason}
            placeholder={t`Enter Reason`}
            onChange={(evt) => setReason(evt.target.value)}
          />
          <p>
            {`${t`Duration`}: `}
            <input
              style={{
                display: 'inline-block',
                width: '100%',
                maxWidth: '7em',
              }}
              value={duration}
              placeholder="1d"
              onChange={(evt) => {
                setDuration(evt.target.value.trim());
              }}
            />
            {t`(0 = infinite)`}
          </p>
        </React.Fragment>
      )}
      <p>
        {' IID: '}
        <input
          value={iid}
          style={{
            display: 'inline-block',
            width: '100%',
            maxWidth: '10em',
          }}
          type="text"
          placeholder="xxxx-xxxxx-xxxx"
          onChange={(evt) => {
            selectIid(evt.target.value.trim());
          }}
        />
        <button
          type="button"
          onClick={() => {
            if (submitting) {
              return;
            }
            setSubmitting(true);
            submitIIDAction(
              iIDAction,
              iid,
              reason,
              duration,
              (ret) => {
                setSubmitting(false);
                setResp(ret);
              },
            );
          }}
        >
          {(submitting) ? '...' : t`Submit`}
        </button>
      </p>
      <textarea
        style={{
          width: '100%',
        }}
        rows={(resp) ? resp.split('\n').length : 10}
        value={resp}
        readOnly
      />
    </div>
  );
}

export default React.memo(ModIIDtools);
