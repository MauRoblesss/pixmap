/*
 * ModWatchtools
 * Tools to check who placed what where
 */

import React, { useState, useEffect } from 'react';
import { useSelector, shallowEqual } from 'react-redux';
import { t } from 'ttag';

import copyTextToClipboard from '../utils/clipboard';
import { parseInterval } from '../core/utils';
import { shardOrigin } from '../store/actions/fetch';

const keepState = {
  tlcoords: '',
  brcoords: '',
  interval: '15m',
  iid: '',
};

/*
 * sorting function for array sort
 */
function compare(a, b, asc) {
  if (typeof a === 'string' && typeof b === 'string') {
    let ret = a.localeCompare(b);
    if (asc) ret *= -1;
    return ret;
  }
  if (!a || a === 'N/A') a = 0;
  if (!b || b === 'N/A') b = 0;
  if (a < b) return (asc) ? -1 : 1;
  if (a > b) return (asc) ? 1 : -1;
  return 0;
}

async function submitWatchAction(
  action,
  canvas,
  tlcoords,
  brcoords,
  interval,
  iid,
  callback,
) {
  let time = parseInterval(interval);
  if (!time) {
    callback({ info: t`Interval is invalid` });
    return;
  }
  time = Date.now() - time;
  const data = new FormData();
  data.append('watchaction', action);
  data.append('canvasid', canvas);
  data.append('ulcoor', tlcoords);
  data.append('brcoor', brcoords);
  data.append('time', time);
  data.append('iid', iid);
  try {
    const resp = await fetch(`${shardOrigin}/api/modtools`, {
      credentials: 'include',
      method: 'POST',
      body: data,
    });
    let ret;
    try {
      ret = await resp.json();
    } catch {
      throw new Error(await resp.text());
    }
    callback(await ret);
  } catch (err) {
    callback({
      info: `Error: ${err.message}`,
    });
  }
}

function ModWatchtools() {
  const [selectedCanvas, selectCanvas] = useState(0);
  const [sortAsc, setSortAsc] = useState(true);
  const [sortBy, setSortBy] = useState(0);
  const [table, setTable] = useState({});
  const [resp, setResp] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [
    canvasId,
    canvases,
  ] = useSelector((state) => [
    state.canvas.canvasId,
    state.canvas.canvases,
  ], shallowEqual);

  useEffect(() => {
    selectCanvas(canvasId);
  }, [canvasId]);

  const {
    columns, types, rows, ts,
  } = table;
  const cidColumn = (types) ? (types.indexOf('cid')) : -1;

  return (
    <>
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
        <p>{t`Check who placed in an area`}</p>
        <p>{t`Canvas`}:&nbsp;
          <select
            value={selectedCanvas}
            onChange={(e) => {
              const sel = e.target;
              selectCanvas(sel.options[sel.selectedIndex].value);
            }}
          >
            {Object.keys(canvases)
              .filter((c) => !canvases[c].v)
              .map((canvas) => (
                <option
                  key={canvas}
                  value={canvas}
                >
                  {canvases[canvas].title}
                </option>
              ))}
          </select>
          {` ${t`Interval`}: `}
          <input
            defaultValue={keepState.interval}
            style={{
              display: 'inline-block',
              width: '100%',
              maxWidth: '5em',
            }}
            type="text"
            placeholder="15m"
            onChange={(evt) => {
              const newInterval = evt.target.value.trim();
              keepState.interval = newInterval;
            }}
          />
          {` ${t`IID (optional)`}: `}
          <input
            defaultValue={keepState.iid}
            style={{
              display: 'inline-block',
              width: '100%',
              maxWidth: '10em',
            }}
            type="text"
            placeholder="xxxx-xxxxx-xxxx"
            onChange={(evt) => {
              const newIid = evt.target.value.trim();
              keepState.iid = newIid;
            }}
          />
        </p>
        <p>
          {t`Top-left corner`} (X_Y):&nbsp;
          <input
            defaultValue={keepState.tlcoords}
            style={{
              display: 'inline-block',
              width: '100%',
              maxWidth: '15em',
            }}
            type="text"
            placeholder="X_Y"
            onChange={(evt) => {
              const co = evt.target.value.trim();
              keepState.tlcoords = co;
            }}
          />
        </p>
        <p>
          {t`Bottom-right corner`} (X_Y):&nbsp;
          <input
            defaultValue={keepState.brcoords}
            style={{
              display: 'inline-block',
              width: '100%',
              maxWidth: '15em',
            }}
            type="text"
            placeholder="X_Y"
            onChange={(evt) => {
              const co = evt.target.value.trim();
              keepState.brcoords = co;
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
            submitWatchAction(
              'all',
              selectedCanvas,
              keepState.tlcoords,
              keepState.brcoords,
              keepState.interval,
              keepState.iid,
              (ret) => {
                setSubmitting(false);
                setResp(ret.info);
                if (ret.rows) {
                  setSortBy(0);
                  setTable({
                    columns: ret.columns,
                    types: ret.types,
                    rows: ret.rows,
                    ts: Date.now(),
                  });
                }
              },
            );
          }}
        >
          {(submitting) ? '...' : t`Get Pixels`}
        </button>
        <button
          type="button"
          onClick={() => {
            if (submitting) {
              return;
            }
            setSubmitting(true);
            submitWatchAction(
              'summary',
              selectedCanvas,
              keepState.tlcoords,
              keepState.brcoords,
              keepState.interval,
              keepState.iid,
              (ret) => {
                setSubmitting(false);
                setResp(ret.info);
                if (ret.rows) {
                  setSortBy(0);
                  setTable({
                    columns: ret.columns,
                    types: ret.types,
                    rows: ret.rows,
                    ts: Date.now(),
                  });
                }
              },
            );
          }}
        >
          {(submitting) ? '...' : t`Get Users`}
        </button>
      </div>
      <br />
      {(rows && columns && types) && (
        <React.Fragment key={ts}>
          <div className="modaldivider" />
          <table style={{ fontSize: 11 }}>
            <thead>
              <tr>
                {columns.slice(1).map((col, ind) => (
                  <th
                    key={col}
                    style={
                      (sortBy - 1 === ind) ? {
                        cursor: 'pointer',
                        fontWeight: 'normal',
                      } : {
                        cursor: 'pointer',
                      }
                    }
                    onClick={() => {
                      if (sortBy - 1 === ind) {
                        setSortAsc(!sortAsc);
                      } else {
                        setSortBy(ind + 1);
                      }
                    }}
                  >{col}</th>
                ))}
              </tr>
            </thead>
            <tbody style={{ userSelect: 'text' }}>
              {rows.sort((a, b) => compare(a[sortBy], b[sortBy], sortAsc))
                .map((row) => (
                  <tr key={row[0]}>
                    {row.slice(1).map((val, ind) => {
                      const type = types[ind + 1];
                      if (val === null) {
                        return (<td key={type}>N/A</td>);
                      }
                      switch (type) {
                        case 'ts': {
                          const date = new Date(val);
                          let minutes = date.getMinutes();
                          if (minutes < 10) minutes = `0${minutes}`;
                          return (
                            <td key={type} title={date.toLocaleDateString()}>
                              {`${date.getHours()}:${minutes}`}
                            </td>
                          );
                        }
                        case 'clr': {
                          const cid = (cidColumn > 0)
                            ? row[cidColumn] : selectedCanvas;
                          const rgb = canvases[cid]
                          && canvases[cid].colors
                          && canvases[cid].colors[val];
                          if (!rgb) {
                            return (<td key={type}>{val}</td>);
                          }
                          const color = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
                          return (
                            <td
                              key={type}
                              style={{ backgroundColor: color }}
                            >{val}</td>
                          );
                        }
                        case 'coord': {
                          const cid = (cidColumn > 0)
                            ? row[cidColumn] : selectedCanvas;
                          const ident = canvases[cid] && canvases[cid].ident;
                          const coords = `./#${ident},${val},47`;
                          return (
                            <td key={type}>
                              <a href={coords}>{val}</a>
                            </td>
                          );
                        }
                        case 'flag': {
                          const flag = val.toLowerCase();
                          return (
                            <td key={type} title={val}><img
                              style={{
                                height: '1em',
                                imageRendering: 'crisp-edges',
                              }}
                              alt={val}
                              src={`/cf/${flag}.gif`}
                            /></td>
                          );
                        }
                        case 'cid': {
                          const ident = canvases?.ident;
                          return (<td key={type}>{ident}</td>);
                        }
                        case 'cidr': {
                          return (
                            <td key={type}>
                              <span
                                role="button"
                                tabIndex={-1}
                                style={{
                                  cursor: 'pointer',
                                  whiteSpace: 'initial',
                                }}
                                title={t`Copy to Clipboard`}
                                onClick={() => copyTextToClipboard(
                                  val.slice(0, val.indexOf('/')),
                                )}
                              >{val}</span>
                            </td>
                          );
                        }
                        case 'uuid': {
                          return (
                            <td key={type}>
                              <span
                                role="button"
                                tabIndex={-1}
                                style={{
                                  cursor: 'pointer',
                                  whiteSpace: 'initial',
                                }}
                                title={t`Copy to Clipboard`}
                                onClick={() => copyTextToClipboard(val)}
                              >{val}</span>
                            </td>
                          );
                        }
                        case 'user': {
                          const seperator = val.lastIndexOf(',');
                          if (seperator === -1) {
                            return (<td key={type}><span>{val}</span></td>);
                          }
                          return (
                            <td key={type} title={val.slice(seperator + 1)}>
                              <span>
                                {val.slice(0, seperator)}
                              </span>
                            </td>
                          );
                        }
                        default: {
                          return (<td key={type}>{val}</td>);
                        }
                      }
                    })}
                  </tr>
                ))}
            </tbody>
          </table>
        </React.Fragment>
      )}
    </>
  );
}

// possible types:
// 'coord', 'clr', 'ts', 'user', 'uuid', 'string', 'number', 'flag', 'cid'

export default React.memo(ModWatchtools);
