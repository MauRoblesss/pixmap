/*
 * ModCanvastools
 */

import React, { useState, useEffect } from 'react';
import { useSelector, shallowEqual } from 'react-redux';
import { t } from 'ttag';

import useInterval from './hooks/interval';
import { getToday, dateToString } from '../core/utils';
import { shardOrigin } from '../store/actions/fetch';

const keptState = {
  coords: '',
  tlcoords: '',
  brcoords: '',
  tlrcoords: '',
  brrcoords: '',
  tlccoords: '',
  brccoords: '',
};

async function submitImageAction(
  action,
  canvas,
  coords,
  callback,
) {
  const data = new FormData();
  const fileSel = document.getElementById('imgfile');
  const file = (!fileSel.files || !fileSel.files[0])
    ? null : fileSel.files[0];
  data.append('imageaction', action);
  data.append('image', file);
  data.append('canvasid', canvas);
  data.append('coords', coords);
  const resp = await fetch(`${shardOrigin}/api/modtools`, {
    credentials: 'include',
    method: 'POST',
    body: data,
  });
  callback(await resp.text());
}

async function submitProtAction(
  action,
  canvas,
  tlcoords,
  brcoords,
  callback,
) {
  const data = new FormData();
  data.append('protaction', action);
  data.append('canvasid', canvas);
  data.append('ulcoor', tlcoords);
  data.append('brcoor', brcoords);
  const resp = await fetch(`${shardOrigin}/api/modtools`, {
    credentials: 'include',
    method: 'POST',
    body: data,
  });
  callback(await resp.text());
}

async function submitRollback(
  date,
  canvas,
  tlcoords,
  brcoords,
  callback,
) {
  const data = new FormData();
  const timeString = dateToString(date);
  data.append('rollback', timeString);
  data.append('canvasid', canvas);
  data.append('ulcoor', tlcoords);
  data.append('brcoor', brcoords);
  const resp = await fetch(`${shardOrigin}/api/modtools`, {
    credentials: 'include',
    method: 'POST',
    body: data,
  });
  callback(await resp.text());
}

async function submitCanvasCleaner(
  action,
  canvas,
  tlcoords,
  brcoords,
  callback,
) {
  const data = new FormData();
  data.append('cleaneraction', action);
  data.append('canvasid', canvas);
  data.append('ulcoor', tlcoords);
  data.append('brcoor', brcoords);
  const resp = await fetch(`${shardOrigin}/api/modtools`, {
    credentials: 'include',
    method: 'POST',
    body: data,
  });
  callback(await resp.text());
}

async function getCleanerStats(
  callback,
) {
  const data = new FormData();
  data.append('cleanerstat', true);
  const resp = await fetch(`${shardOrigin}/api/modtools`, {
    credentials: 'include',
    method: 'POST',
    body: data,
  });
  if (resp.ok) {
    callback(await resp.json());
  } else {
    callback({
    });
  }
}

async function getCleanerCancel(
  callback,
) {
  const data = new FormData();
  data.append('cleanercancel', true);
  const resp = await fetch(`${shardOrigin}/api/modtools`, {
    credentials: 'include',
    method: 'POST',
    body: data,
  });
  if (resp.ok) {
    callback(await resp.text());
  } else {
    callback('');
  }
}

function ModCanvastools() {
  const maxDate = getToday();

  const [selectedCanvas, selectCanvas] = useState(0);
  const [imageAction, selectImageAction] = useState('build');
  const [cleanAction, selectCleanAction] = useState('spare');
  const [protAction, selectProtAction] = useState('protect');
  const [date, selectDate] = useState(maxDate);
  const [resp, setResp] = useState(null);
  const [cleanerstats, setCleanerStats] = useState({});
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

  let descAction;
  switch (imageAction) {
    case 'build':
      descAction = t`Build image on canvas.`;
      break;
    case 'protect':
      descAction = t`Build image and set it to protected.`;
      break;
    case 'wipe':
      descAction = t`Build image, but reset cooldown to unset-pixel cd.`;
      break;
    default:
      // nothing
  }

  let descCleanAction;
  switch (cleanAction) {
    case 'spare':
      // eslint-disable-next-line max-len
      descCleanAction = t`Clean spare pixels that are surrounded by unset pixels`;
      break;
    case 'spareext':
      // eslint-disable-next-line max-len
      descCleanAction = t`Clean spare pixels that are surrounded by unset pixels and up to 1 other set pixels`;
      break;
    case 'spareextu':
      // eslint-disable-next-line max-len
      descCleanAction = t`Clean spare pixels that are surrounded by a single other color or unset pixels (VERY AGGRESSIVE ON CANVASES THAT ALLOW UNSET PIXELS (where there are two cooldowns)!)`;
      break;
    default:
      // nothing
  }

  useInterval(() => {
    getCleanerStats((stats) => setCleanerStats(stats));
  }, 10000);

  const cleanerStatusString = (!cleanerstats.running)
    ? t`Status: Not running`
  // eslint-disable-next-line max-len
    : `Status: ${cleanerstats.method} from ${cleanerstats.tl} to ${cleanerstats.br} on canvas ${canvases[cleanerstats.canvasId].ident} to ${cleanerstats.percent} done`;

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
      <p>{t`Choose Canvas`}:&nbsp;
        <select
          value={selectedCanvas}
          onChange={(e) => {
            const sel = e.target;
            selectCanvas(sel.options[sel.selectedIndex].value);
          }}
        >
          {Object.keys(canvases).filter((c) => !canvases[c].v).map((canvas) => (
            <option
              key={canvas}
              value={canvas}
            >
              {canvases[canvas].title}
            </option>
          ))}
        </select>
      </p>
      <div className="modaldivider" />
      <h3>{t`Image Upload`}</h3>
      <p>{t`Upload images to canvas`}</p>
      <p>
        {t`File`}:&nbsp;
        <input type="file" name="image" id="imgfile" />
      </p>
      <select
        value={imageAction}
        onChange={(e) => {
          const sel = e.target;
          selectImageAction(sel.options[sel.selectedIndex].value);
        }}
      >
        {['build', 'protect', 'wipe'].map((opt) => (
          <option
            key={opt}
            value={opt}
          >
            {opt}
          </option>
        ))}
      </select>
      <p>{descAction}</p>
      <p>
        {t`Coordinates in X_Y format:`}&nbsp;
        <input
          defaultValue={keptState.coords}
          style={{
            display: 'inline-block',
            width: '100%',
            maxWidth: '15em',
          }}
          type="text"
          placeholder="X_Y"
          onChange={(evt) => {
            keptState.coords = evt.target.value.trim();
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
          submitImageAction(
            imageAction,
            selectedCanvas,
            keptState.coords,
            (ret) => {
              setSubmitting(false);
              setResp(ret);
            },
          );
        }}
      >
        {(submitting) ? '...' : t`Submit`}
      </button>

      <br />
      <div className="modaldivider" />
      <h3>{t`Pixel Protection`}</h3>
      <p>
        {t`Set protection of areas \
        (if you need finer grained control, \
        use protect with image upload and alpha layers)`}
      </p>
      <select
        value={protAction}
        onChange={(e) => {
          const sel = e.target;
          selectProtAction(sel.options[sel.selectedIndex].value);
        }}
      >
        {['protect', 'unprotect'].map((opt) => (
          <option
            key={opt}
            value={opt}
          >
            {opt}
          </option>
        ))}
      </select>
      <p>
        {t`Top-left corner`} (X_Y):&nbsp;
        <input
          defaultValue={keptState.tlcoords}
          style={{
            display: 'inline-block',
            width: '100%',
            maxWidth: '15em',
          }}
          type="text"
          placeholder="X_Y"
          onChange={(evt) => {
            const co = evt.target.value.trim();
            keptState.tlcoords = co;
          }}
        />
      </p>
      <p>
        {t`Bottom-right corner`} (X_Y):&nbsp;
        <input
          defaultValue={keptState.brcoords}
          style={{
            display: 'inline-block',
            width: '100%',
            maxWidth: '15em',
          }}
          type="text"
          placeholder="X_Y"
          onChange={(evt) => {
            const co = evt.target.value.trim();
            keptState.brcoords = co;
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
          submitProtAction(
            protAction,
            selectedCanvas,
            keptState.tlcoords,
            keptState.brcoords,
            (ret) => {
              setSubmitting(false);
              setResp(ret);
            },
          );
        }}
      >
        {(submitting) ? '...' : t`Submit`}
      </button>
      {(window.ssv && window.ssv.backupurl) && (
        <div>
          <br />
          <div className="modaldivider" />
          <h3>{t`Rollback to Date`}</h3>
          <p>
            {t`Rollback an area of the canvas to a set date (00:00 UTC)`}
          </p>
          <input
            type="date"
            value={date}
            pattern="\d{4}-\d{2}-\d{2}"
            min={canvases[selectedCanvas].sd}
            max={maxDate}
            onChange={(evt) => {
              selectDate(evt.target.value);
            }}
          />
          <p>
            {t`Top-left corner`} (X_Y):&nbsp;
            <input
              defaultValue={keptState.tlrcoords}
              style={{
                display: 'inline-block',
                width: '100%',
                maxWidth: '15em',
              }}
              type="text"
              placeholder="X_Y"
              onChange={(evt) => {
                const co = evt.target.value.trim();
                keptState.tlrcoords = co;
              }}
            />
          </p>
          <p>
            {t`Bottom-right corner`} (X_Y):&nbsp;
            <input
              defaultValue={keptState.brrcoords}
              style={{
                display: 'inline-block',
                width: '100%',
                maxWidth: '15em',
              }}
              type="text"
              placeholder="X_Y"
              onChange={(evt) => {
                const co = evt.target.value.trim();
                keptState.brrcoords = co;
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
              submitRollback(
                date,
                selectedCanvas,
                keptState.tlrcoords,
                keptState.brrcoords,
                (ret) => {
                  setSubmitting(false);
                  setResp(ret);
                },
              );
            }}
          >
            {(submitting) ? '...' : t`Submit`}
          </button>
        </div>
      )}
      <br />
      <div className="modaldivider" />
      <h3>{t`Canvas Cleaner`}</h3>
      <p>
        {t`Apply a filter to clean trash in large canvas areas.`}
      </p>
      <select
        value={cleanAction}
        onChange={(e) => {
          const sel = e.target;
          selectCleanAction(sel.options[sel.selectedIndex].value);
        }}
      >
        {['spare', 'spareext', 'spareextu'].map((opt) => (
          <option
            key={opt}
            value={opt}
          >
            {opt}
          </option>
        ))}
      </select>
      <p>{descCleanAction}</p>
      <p style={{ fontWeight: 'bold' }}>
        {cleanerStatusString}
      </p>
      <p>
        {t`Top-left corner`} (X_Y):&nbsp;
        <input
          defaultValue={keptState.tlccoords}
          style={{
            display: 'inline-block',
            width: '100%',
            maxWidth: '15em',
          }}
          type="text"
          placeholder="X_Y"
          onChange={(evt) => {
            const co = evt.target.value.trim();
            keptState.tlccoords = co;
          }}
        />
      </p>
      <p>
        {t`Bottom-right corner`} (X_Y):&nbsp;
        <input
          defaultValue={keptState.brccoords}
          style={{
            display: 'inline-block',
            width: '100%',
            maxWidth: '15em',
          }}
          type="text"
          placeholder="X_Y"
          onChange={(evt) => {
            const co = evt.target.value.trim();
            keptState.brccoords = co;
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
          submitCanvasCleaner(
            cleanAction,
            selectedCanvas,
            keptState.tlccoords,
            keptState.brccoords,
            (ret) => {
              setCleanerStats({
                running: true,
                percent: 'N/A',
                method: cleanAction,
                tl: keptState.tlccoords,
                br: keptState.brccoords,
                canvasId: selectedCanvas,
              });
              setSubmitting(false);
              setResp(ret);
            },
          );
        }}
      >
        {(submitting) ? '...' : t`Submit`}
      </button>
      <button
        type="button"
        onClick={() => {
          if (submitting) {
            return;
          }
          setSubmitting(true);
          getCleanerCancel(
            (ret) => {
              setCleanerStats({});
              setSubmitting(false);
              setResp(ret);
            },
          );
        }}
      >
        {(submitting) ? '...' : t`Stop Cleaner`}
      </button>
    </div>
  );
}

export default React.memo(ModCanvastools);
