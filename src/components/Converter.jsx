/**
 * Converts images to canvas palettes
 */

import React, { useState, useEffect } from 'react';
import { useSelector, shallowEqual } from 'react-redux';
import fileDownload from 'js-file-download';
import { jt, t } from 'ttag';

import {
  ColorDistanceCalculators,
  ImageQuantizerKernels,
  readFileIntoCanvas,
  scaleImage,
  quantizeImage,
  addGrid,
} from '../utils/image';
import printGIMPPalette from '../core/exportGPL';
import { copyCanvasToClipboard } from '../utils/clipboard';


function downloadOutput() {
  const output = document.getElementById('imgoutput');
  output.toBlob((blob) => fileDownload(blob, 'pmfunconvert.png'));
}

let renderOpts = null;
let rendering = false;
async function renderOutputImage(opts) {
  if (!opts.imgCanvas) {
    return;
  }
  renderOpts = opts;
  if (rendering) {
    return;
  }
  rendering = true;
  while (renderOpts) {
    const {
      colors, imgCanvas, ditherOpts, grid, scaling,
    } = renderOpts;
    renderOpts = null;
    if (imgCanvas) {
      let image = imgCanvas;
      if (scaling.enabled) {
        // scale
        const { width, height, aa } = scaling;
        image = scaleImage(
          imgCanvas,
          width,
          height,
          aa,
        );
      }
      // dither
      const progEl = document.getElementById('qprog');
      progEl.innerText = 'Loading...';
      // eslint-disable-next-line no-await-in-loop
      image = await quantizeImage(colors, image, {
        ...ditherOpts,
        onProgress: (progress) => {
          progEl.innerText = `Loading... ${Math.round(progress)} %`;
        },
      });
      progEl.innerText = 'Done';
      // grid
      if (grid.enabled) {
        const { light, offsetX, offsetY } = grid;
        image = addGrid(
          image,
          light,
          offsetX,
          offsetY,
        );
      }
      // draw
      const output = document.getElementById('imgoutput');
      output.width = image.width;
      output.height = image.height;
      const ctx = output.getContext('2d');
      ctx.drawImage(image, 0, 0);
    }
  }
  rendering = false;
}


function Converter() {
  const [
    canvasId,
    canvases,
    showHiddenCanvases,
  ] = useSelector((state) => [
    state.canvas.canvasId,
    state.canvas.canvases,
    state.canvas.showHiddenCanvases,
  ], shallowEqual);

  const [selectedCanvas, selectCanvas] = useState(canvasId);
  const [inputImageCanvas, setInputImageCanvas] = useState(null);
  const [selectedStrategy, selectStrategy] = useState('Nearest');
  const [selectedColorDist, selectColorDist] = useState('Euclidean');
  const [selectedScaleKeepRatio, selectScaleKeepRatio] = useState(true);
  const [extraOpts, setExtraOpts] = useState({
    serpentine: true,
    minColorDistance: 0,
    GIMPerror: false,
  });
  const [scaleData, setScaleData] = useState({
    enabled: false,
    width: 10,
    height: 10,
    aa: true,
  });
  const [gridData, setGridData] = useState({
    enabled: false,
    light: false,
    offsetX: 0,
    offsetY: 0,
  });
  const [extraRender, setExtraRender] = useState(false);
  const [gridRender, setGridRender] = useState(false);
  const [scalingRender, setScalingRender] = useState(false);

  useEffect(() => {
    if (inputImageCanvas) {
      const canvas = canvases[selectedCanvas];
      renderOutputImage({
        colors: (canvas.cli) ? canvas.colors.slice(canvas.cli) : canvas.colors,
        imgCanvas: inputImageCanvas,
        ditherOpts: {
          strategy: selectedStrategy,
          colorDist: selectedColorDist,
          ...extraOpts,
        },
        grid: gridData,
        scaling: scaleData,
      });
    }
  }, [
    selectedCanvas,
    inputImageCanvas,
    selectedStrategy,
    selectedColorDist,
    extraOpts,
    scaleData,
    gridData,
  ]);

  const {
    serpentine,
    minColorDistance,
    GIMPerror,
  } = extraOpts;
  const {
    enabled: gridEnabled,
    light: gridLight,
    offsetX: gridOffsetX,
    offsetY: gridOffsetY,
  } = gridData;
  const {
    enabled: scalingEnabled,
    width: scalingWidth,
    height: scalingHeight,
    aa: scalingAA,
  } = scaleData;

  const showExtraOptions = selectedStrategy !== 'Nearest'
    && selectedStrategy !== 'Riemersma';
  useEffect(() => {
    if (showExtraOptions) {
      setTimeout(() => setExtraRender(true), 10);
    }
  }, [selectedStrategy]);
  useEffect(() => {
    if (gridEnabled) {
      setTimeout(() => setGridRender(true), 10);
    }
  }, [gridData.enabled]);
  useEffect(() => {
    if (scalingEnabled) {
      setTimeout(() => setScalingRender(true), 10);
    }
  }, [scaleData.enabled]);

  const gimpLink = <a href="https://www.gimp.org">GIMP</a>;

  return (
    <div className="content">
      <div>{t`Choose Canvas`}:&nbsp;
        <select
          value={selectedCanvas}
          onChange={(e) => {
            const sel = e.target;
            selectCanvas(sel.options[sel.selectedIndex].value);
          }}
        >
          {
          Object.keys(canvases).map((canvas) => (
            (canvases[canvas].v
              || (canvases[canvas].hid && !showHiddenCanvases))
              ? null
              : (
                <option
                  key={canvas}
                  value={canvas}
                >
                  {
              canvases[canvas].title
            }
                </option>
              )
          ))
        }
        </select>
      </div>
      <h3>{t`Palette Download`}</h3>
      <div>
        {jt`Palette for ${gimpLink}`}:&nbsp;
        <button
          type="button"
          style={{ display: 'inline' }}
          onClick={() => {
            const canvas = canvases[selectedCanvas];
            const {
              title,
              desc,
              colors,
              cli = 0,
            } = canvas;
            fileDownload(
              printGIMPPalette(title, desc, colors.slice(cli)),
              `Pixmap${title}.gpl`,
            );
          }}
        >
          Download
        </button>
      </div>
      <h3>{t`Image Converter`}</h3>
      <p>{t`Convert an image to canvas colors`}</p>
      <input
        type="file"
        id="imgfile"
        onChange={async (evt) => {
          const fileSel = evt.target;
          const file = (!fileSel.files || !fileSel.files[0])
            ? null : fileSel.files[0];
          const imageData = await readFileIntoCanvas(file);
          setInputImageCanvas(null);
          setScaleData({
            enabled: false,
            width: imageData.width,
            height: imageData.height,
            aa: true,
          });
          setInputImageCanvas(imageData);
        }}
      />
      <p>{t`Choose Strategy`}:&nbsp;
        <select
          value={selectedStrategy}
          onChange={(e) => {
            const sel = e.target;
            selectStrategy(sel.options[sel.selectedIndex].value);
          }}
        >
          {
            ImageQuantizerKernels.map((strat) => (
              <option
                key={strat}
                value={strat}
              >{strat}</option>
            ))
          }
        </select>
      </p>
      {(showExtraOptions || extraRender) && (
        <div
          className={(showExtraOptions && extraRender)
            ? 'convBox show'
            : 'convBox'}
          onTransitionEnd={() => {
            if (!showExtraOptions) setExtraRender(false);
          }}
        >
          <p style={{ fontHeight: 16 }}>
            <input
              type="checkbox"
              checked={serpentine}
              onChange={(e) => {
                setExtraOpts({
                  ...extraOpts,
                  serpentine: e.target.checked,
                });
              }}
            />
            {t`Serpentine`}
          </p>
          <span>{t`Minimum Color Distance`}:&nbsp;
            <input
              type="number"
              step="1"
              min="0"
              max="100"
              style={{ width: '4em' }}
              value={minColorDistance}
              onChange={(e) => {
                setExtraOpts({
                  ...extraOpts,
                  minColorDistance: e.target.value,
                });
              }}
            />&nbsp;
          </span>
          <p style={{ fontHeight: 16 }}>
            <input
              type="checkbox"
              checked={GIMPerror}
              onChange={(e) => {
                setExtraOpts({
                  ...extraOpts,
                  GIMPerror: e.target.checked,
                });
              }}
            />
            {t`Calculate like GIMP`}
          </p>
        </div>
      )}
      <p>{t`Choose Color Mode`}:&nbsp;
        <select
          value={selectedColorDist}
          onChange={(e) => {
            const sel = e.target;
            selectColorDist(sel.options[sel.selectedIndex].value);
          }}
        >
          {
            ColorDistanceCalculators.map((strat) => (
              <option
                key={strat}
                value={strat}
              >{strat}</option>
            ))
          }
        </select>
      </p>
      <p style={{ fontHeight: 16 }}>
        <input
          type="checkbox"
          checked={gridEnabled}
          onChange={(e) => {
            setGridData({
              ...gridData,
              enabled: e.target.checked,
            });
          }}
        />
        {t`Add Grid (uncheck if you need a 1:1 template)`}
      </p>
      {(gridEnabled || gridRender) && (
        <div
          className={(gridEnabled && gridRender) ? 'convBox show' : 'convBox'}
          onTransitionEnd={() => {
            if (!gridEnabled) setGridRender(false);
          }}
        >
          <p style={{ fontHeight: 16 }}>
            <input
              type="checkbox"
              checked={gridLight}
              onChange={(e) => {
                setGridData({
                  ...gridData,
                  light: e.target.checked,
                });
              }}
            />
            {t`Light Grid`}
          </p>
          <span>{t`Offset`} X:&nbsp;
            <input
              type="number"
              step="1"
              min="0"
              max="10"
              style={{ width: '2em' }}
              value={gridOffsetX}
              onChange={(e) => {
                setGridData({
                  ...gridData,
                  offsetX: e.target.value,
                });
              }}
            />&nbsp;
          </span>
          <span>{t`Offset`} Y:&nbsp;
            <input
              type="number"
              step="1"
              min="0"
              max="10"
              style={{ width: '2em' }}
              value={gridOffsetY}
              onChange={(e) => {
                setGridData({
                  ...gridData,
                  offsetY: e.target.value,
                });
              }}
            />
          </span>
        </div>
      )}
      <p style={{ fontHeight: 16 }}>
        <input
          type="checkbox"
          checked={scalingEnabled}
          onChange={(e) => {
            setScaleData({
              ...scaleData,
              enabled: e.target.checked,
            });
          }}
        />
        {t`Scale Image`}
      </p>
      {(scalingEnabled || scalingRender) && (
        <div
          className={(scalingEnabled && scalingRender)
            ? 'convBox show'
            : 'convBox'}
          onTransitionEnd={() => {
            if (!scalingEnabled) setScalingRender(false);
          }}
        >
          <span>{t`Width`}:&nbsp;
            <input
              type="number"
              step="1"
              min="1"
              max="1024"
              style={{ width: '3em' }}
              value={scalingWidth}
              onChange={(e) => {
                const newWidth = (e.target.value > 1024)
                  ? 1024 : e.target.value;
                if (!newWidth) return;
                if (selectedScaleKeepRatio && inputImageCanvas) {
                  const ratio = inputImageCanvas.width
                    / inputImageCanvas.height;
                  const newHeight = Math.round(newWidth / ratio);
                  if (newHeight <= 0) return;
                  setScaleData({
                    ...scaleData,
                    width: newWidth,
                    height: newHeight,
                  });
                  return;
                }
                setScaleData({
                  ...scaleData,
                  width: newWidth,
                });
              }}
            />&nbsp;
          </span>
          <span>{t`Height`}:&nbsp;
            <input
              type="number"
              step="1"
              min="1"
              max="1024"
              style={{ width: '3em' }}
              value={scalingHeight}
              onChange={(e) => {
                const nuHeight = (e.target.value > 1024)
                  ? 1024 : e.target.value;
                if (!nuHeight) return;
                if (selectedScaleKeepRatio && inputImageCanvas) {
                  const ratio = inputImageCanvas.width
                    / inputImageCanvas.height;
                  const nuWidth = Math.round(ratio * nuHeight);
                  if (nuWidth <= 0) return;
                  setScaleData({
                    ...scaleData,
                    width: nuWidth,
                    height: nuHeight,
                  });
                  return;
                }
                setScaleData({
                  ...scaleData,
                  height: nuHeight,
                });
              }}
            />
          </span>
          <p style={{ fontHeight: 16 }}>
            <input
              type="checkbox"
              checked={selectedScaleKeepRatio}
              onChange={(e) => {
                selectScaleKeepRatio(e.target.checked);
              }}
            />
            {t`Keep Ratio`}
          </p>
          <p style={{ fontHeight: 16 }}>
            <input
              type="checkbox"
              checked={scalingAA}
              onChange={(e) => {
                setScaleData({
                  ...scaleData,
                  aa: e.target.checked,
                });
              }}
            />
            {t`Anti Aliasing`}
          </p>
          <button
            type="button"
            onClick={() => {
              if (inputImageCanvas) {
                setScaleData({
                  ...scaleData,
                  width: inputImageCanvas.width,
                  height: inputImageCanvas.height,
                });
              }
            }}
          >
            {t`Reset`}
          </button>
        </div>
      )}
      {(inputImageCanvas)
        ? (
          <div>
            <p id="qprog">...</p>
            <p>
              <canvas
                id="imgoutput"
                style={{ width: '80%', imageRendering: 'crisp-edges' }}
              />
            </p>
            <button
              type="button"
              onClick={downloadOutput}
            >
              {t`Download Template`}
            </button>
            {(typeof ClipboardItem === 'undefined')
              ? null
              : (
                <button
                  type="button"
                  onClick={() => {
                    const output = document.getElementById('imgoutput');
                    copyCanvasToClipboard(output);
                  }}
                >
                  {t`Copy to Clipboard`}
                </button>
              )}
          </div>
        ) : null}
    </div>
  );
}

export default Converter;
