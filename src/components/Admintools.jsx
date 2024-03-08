/*
 * Admintools
 */

import React, { useState, useEffect } from 'react';
import { t } from 'ttag';

import { shardOrigin } from '../store/actions/fetch';

async function submitIPAction(
  action,
  vallist,
  callback,
) {
  const data = new FormData();
  data.append('ipaction', action);
  data.append('ip', vallist);
  const resp = await fetch(`${shardOrigin}/api/modtools`, {
    credentials: 'include',
    method: 'POST',
    body: data,
  });
  callback(await resp.text());
}

async function getModList(
  callback,
) {
  const data = new FormData();
  data.append('modlist', true);
  const resp = await fetch(`${shardOrigin}/api/modtools`, {
    credentials: 'include',
    method: 'POST',
    body: data,
  });
  if (resp.ok) {
    callback(await resp.json());
  } else {
    callback([]);
  }
}

async function submitRemMod(
  userId,
  callback,
) {
  const data = new FormData();
  data.append('remmod', userId);
  const resp = await fetch(`${shardOrigin}/api/modtools`, {
    credentials: 'include',
    method: 'POST',
    body: data,
  });
  callback(resp.ok, await resp.text());
}

async function submitMakeMod(
  userName,
  callback,
) {
  const data = new FormData();
  data.append('makemod', userName);
  const resp = await fetch(`${shardOrigin}/api/modtools`, {
    credentials: 'include',
    method: 'POST',
    body: data,
  });
  if (resp.ok) {
    callback(await resp.json());
  } else {
    callback(await resp.text());
  }
}


function Admintools() {
  const [iPAction, selectIPAction] = useState('iidtoip');
  const [modName, selectModName] = useState('');
  const [txtval, setTxtval] = useState('');
  const [resp, setResp] = useState(null);
  const [modlist, setModList] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getModList((mods) => setModList(mods));
  }, []);

  return (
    <div className="content">
      {resp && (
        <div className="respbox">
          {resp.split('\n').map((line) => (
            <p key={line.slice(0, 3)}>
              {line}
            </p>
          ))}
          <span
            role="button"
            tabIndex={-1}
            className="modallink"
            onClick={() => setResp(null)}
          >
            {t`Close`}
          </span>
        </div>
      )}
      <div>
        <br />
        <h3>{t`IP Actions`}</h3>
        <p>
          {t`Do stuff with IPs (one IP per line)`}
        </p>
        <select
          value={iPAction}
          onChange={(e) => {
            const sel = e.target;
            selectIPAction(sel.options[sel.selectedIndex].value);
          }}
        >
          {['iidtoip', 'iptoiid']
            .map((opt) => (
              <option
                key={opt}
                value={opt}
              >
                {opt}
              </option>
            ))}
        </select>
        <br />
        <textarea
          rows="10"
          cols="17"
          value={txtval}
          onChange={(e) => setTxtval(e.target.value)}
        /><br />
        <button
          type="button"
          onClick={() => {
            if (submitting) {
              return;
            }
            setSubmitting(true);
            submitIPAction(
              iPAction,
              txtval,
              (ret) => {
                setSubmitting(false);
                setTxtval(ret);
              },
            );
          }}
        >
          {(submitting) ? '...' : t`Submit`}
        </button>
        <br />
        <div className="modaldivider" />
        <h3>{t`Manage Moderators`}</h3>
        <p>
          {t`Remove Moderator`}
        </p>
        {(modlist.length) ? (
          <span
            className="unblocklist"
          >
            {modlist.map((mod) => (
              <div
                role="button"
                tabIndex={0}
                key={mod[0]}
                onClick={() => {
                  if (submitting) {
                    return;
                  }
                  setSubmitting(true);
                  submitRemMod(mod[0], (success, ret) => {
                    if (success) {
                      setModList(
                        modlist.filter((modl) => (modl[0] !== mod[0])),
                      );
                    }
                    setSubmitting(false);
                    setResp(ret);
                  });
                }}
              >
                {`⦸ ${mod[0]} ${mod[1]}`}
              </div>
            ))}
          </span>
        )
          : (
            <p>{t`There are no mods`}</p>
          )}
        <br />

        <p>
          {t`Assign new Mod`}
        </p>
        <p>
          {t`Enter UserName of new Mod`}:&nbsp;
          <input
            value={modName}
            style={{
              display: 'inline-block',
              width: '100%',
              maxWidth: '20em',
            }}
            type="text"
            placeholder={t`User Name`}
            onChange={(evt) => {
              const co = evt.target.value.trim();
              selectModName(co);
            }}
          />
        </p>
        <button
          type="button"
          onClick={() => {
            if (submitting) {
              return;
            }
            setSubmitting(true);
            submitMakeMod(
              modName,
              (ret) => {
                if (typeof ret === 'string') {
                  setResp(ret);
                } else {
                  setResp(`Made ${ret[1]} mod successfully.`);
                  setModList([...modlist, ret]);
                }
                setSubmitting(false);
              },
            );
          }}
        >
          {(submitting) ? '...' : t`Submit`}
        </button>
        <br />
        <div className="modaldivider" />
        <br />
      </div>
    </div>
  );
}

export default React.memo(Admintools);
