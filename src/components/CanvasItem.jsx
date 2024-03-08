/**
 *
 */

import React from 'react';
import { t } from 'ttag';

import { THREE_CANVAS_HEIGHT } from '../core/constants';


const CanvasItem = ({
  canvasId, canvas, selCanvas, online,
}) => (
  <div
    className="cvbtn"
    onClick={() => selCanvas(canvasId)}
    role="button"
    tabIndex={0}
  >
    <img
      className="cvimg"
      alt="preview"
      src={`/preview${canvasId}.png`}
    />
    <div className="modalcvtext">
      <h4>{canvas.title}</h4>
      {(online) && (
        <React.Fragment key="online">
          {t`Online Users`}:&nbsp;
          <span className="modalinfo">{online}</span><br />
        </React.Fragment>
      )}
      <span className="modalinfo">{canvas.desc}</span><br />
      {t`Cooldown`}:&nbsp;
      <span className="modalinfo">
        {(canvas.pcd && canvas.bcd !== canvas.pcd)
          ? <span key="cdf"> {canvas.bcd / 1000}s / {canvas.pcd / 1000}s</span>
          : <span key="cd"> {canvas.bcd / 1000}s</span>}
      </span><br />
      {t`Stacking till`}:&nbsp;
      <span className="modalinfo"> {canvas.cds / 1000}s</span><br />
      {t`Ranked`}:&nbsp;
      <span className="modalinfo">{
        (canvas.ranked) ? t`Yes` : t`No`
      }
      </span><br />
      {(canvas.req !== undefined) && (
        <React.Fragment key="req">
          <span>
            {t`Requirements`}:<br />
            <span className="modalinfo">
              {(typeof canvas.req === 'number')
                ? <span>{t`User Account`} </span> : null}
              {(canvas.req > 0)
                ? <span> {t`and ${canvas.req} Pixels set`} </span>
                : null}
              {(canvas.req === 'top')
                  && <span>{t`Top 10 Daily Ranking`}</span>}
            </span>
          </span>
          <br />
        </React.Fragment>
      )}
      {t`Dimensions`}:&nbsp;
      <span className="modalinfo"> {canvas.size} x {canvas.size}
        {(canvas.v)
          ? <span key="voxsize"> x {THREE_CANVAS_HEIGHT} Voxels</span>
          : <span key="pxlsize"> Pixels</span>}
      </span>
    </div>
  </div>
);

export default React.memo(CanvasItem);
