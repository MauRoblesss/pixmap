/**
 * Basic image manipulation and quantization
 */

import { utils, distance, image } from 'image-q';


/*
 * available color distance calculators
 */
export const ColorDistanceCalculators = [
  'Euclidean',
  'Manhattan',
  'CIEDE2000',
  'CIE94Textiles',
  'CIE94GraphicArts',
  'EuclideanBT709NoAlpha',
  'EuclideanBT709',
  'ManhattanBT709',
  'CMetric',
  'PNGQuant',
  'ManhattanNommyde',
];

/*
 * available dithers
 */
export const ImageQuantizerKernels = [
  'Nearest',
  'Riemersma',
  'FloydSteinberg',
  'FalseFloydSteinberg',
  'Stucki',
  'Atkinson',
  'Jarvis',
  'Burkes',
  'Sierra',
  'TwoSierra',
  'SierraLite',
];

export function addGrid(imgCanvas, lightGrid, offsetX, offsetY) {
  const { width, height } = imgCanvas;
  const can = document.createElement('canvas');
  const ctx = can.getContext('2d');
  can.width = width * 5;
  can.height = height * 5;
  ctx.imageSmoothingEnabled = false;
  ctx.mozImageSmoothingEnabled = false;
  ctx.webkitImageSmoothingEnabled = false;
  ctx.msImageSmoothingEnabled = false;
  ctx.save();
  ctx.scale(5.0, 5.0);
  ctx.drawImage(imgCanvas, 0, 0);
  ctx.restore();
  ctx.fillStyle = (lightGrid) ? '#DDDDDD' : '#222222';
  for (let i = 0; i <= width; i += 1) {
    const thick = ((i + (offsetX * 1)) % 10 === 0) ? 2 : 1;
    ctx.fillRect(i * 5, 0, thick, can.height);
  }
  for (let j = 0; j <= height; j += 1) {
    const thick = ((j + (offsetY * 1)) % 10 === 0) ? 2 : 1;
    ctx.fillRect(0, j * 5, can.width, thick);
  }
  return can;
}

export function scaleImage(imgCanvas, width, height, doAA) {
  const can = document.createElement('canvas');
  can.width = width;
  can.height = height;
  const ctxo = can.getContext('2d');
  const scaleX = width / imgCanvas.width;
  const scaleY = height / imgCanvas.height;
  if (doAA) {
    // scale with canvas for antialiasing
    ctxo.save();
    ctxo.scale(scaleX, scaleY);
    ctxo.drawImage(imgCanvas, 0, 0);
    ctxo.restore();
  } else {
    // scale manually
    const ctxi = imgCanvas.getContext('2d');
    const imdi = ctxi.getImageData(0, 0, imgCanvas.width, imgCanvas.height);
    const imdo = ctxo.createImageData(width, height);
    const { data: datai } = imdi;
    const { data: datao } = imdo;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        let posi = (Math.round(x / scaleX) + Math.round(y / scaleY)
            * imgCanvas.width) * 4;
        let poso = (x + y * width) * 4;
        datao[poso++] = datai[posi++];
        datao[poso++] = datai[posi++];
        datao[poso++] = datai[posi++];
        datao[poso] = datai[posi];
      }
    }
    ctxo.putImageData(imdo, 0, 0);
  }
  return can;
}

/*
 * read File object into canvas
 * @param file
 * @return HTMLCanvas
 */
export function readFileIntoCanvas(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const cani = document.createElement('canvas');
        cani.width = img.width;
        cani.height = img.height;
        const ctxi = cani.getContext('2d');
        ctxi.drawImage(img, 0, 0);
        resolve(cani);
      };
      img.onerror = (error) => reject(error);
      img.src = fr.result;
    };
    fr.onerror = (error) => reject(error);
    fr.readAsDataURL(file);
  });
}

/*
 * converts pointContainer to HTMLCanvas
 * @param pointContainer
 * @return HTMLCanvas
 */
function createCanvasFromPointContainer(pointContainer) {
  const width = pointContainer.getWidth();
  const height = pointContainer.getHeight();
  const data = pointContainer.toUint8Array();
  const can = document.createElement('canvas');
  can.width = width;
  can.height = height;
  const ctx = can.getContext('2d');
  const idata = ctx.createImageData(width, height);
  idata.data.set(data);
  ctx.putImageData(idata, 0, 0);
  return can;
}

/*
 * quantizes point container
 * @param colors Array of [r, g, b] color Arrays
 * @param pointContainer pointContainer of input image
 * @param opts Object with configuration:
 *    strategy: String of dithering strategy (ImageQuantizerKernels)
 *    colorDist: String of color distance calc (ColorDistanceCalculators)
 *    onProgress: function that gets called with integer of progress percentage
 *  and only available for not Nearest or Riemersma
 *    serpentine: type of dithering
 *    minColorDistance: minimal distance on which we start to dither
 *    GIMPerror: calculate error like GIMP
 * @return Promise that resolves to HTMLCanvasElement of output image
 */
function quantizePointContainer(colors, pointContainer, opts) {
  const strategy = opts.strategy || 'Nearest';
  const colorDist = opts.colorDist || 'Euclidean';

  return new Promise((resolve, reject) => {
    // create palette
    const palette = new utils.Palette();
    palette.add(utils.Point.createByRGBA(0, 0, 0, 0));
    for (let i = 0; i < colors.length; i += 1) {
      const [r, g, b] = colors[i];
      const point = utils.Point.createByRGBA(r, g, b, 255);
      palette.add(point);
    }
    // construct color distance calculator
    let distCalc;
    switch (colorDist) {
      case 'Euclidean': {
        distCalc = new distance.Euclidean();
        break;
      }
      case 'Manhattan': {
        distCalc = new distance.Manhattan();
        break;
      }
      case 'CIEDE2000': {
        distCalc = new distance.CIEDE2000();
        break;
      }
      case 'CIE94Textiles': {
        distCalc = new distance.CIE94Textiles();
        break;
      }
      case 'CIE94GraphicArts': {
        distCalc = new distance.CIE94GraphicArts();
        break;
      }
      case 'EuclideanBT709NoAlpha': {
        distCalc = new distance.EuclideanBT709NoAlpha();
        break;
      }
      case 'EuclideanBT709': {
        distCalc = new distance.EuclideanBT709();
        break;
      }
      case 'ManhattanBT709': {
        distCalc = new distance.ManhattanBT709();
        break;
      }
      case 'CMetric': {
        distCalc = new distance.CMetric();
        break;
      }
      case 'PNGQuant': {
        distCalc = new distance.PNGQuant();
        break;
      }
      case 'ManhattanNommyde': {
        distCalc = new distance.ManhattanNommyde();
        break;
      }
      default:
        distCalc = new distance.Euclidean();
    }
    // could be needed for some reason sometimes
    // eslint-disable-next-line no-underscore-dangle
    if (distCalc._setDefaults) distCalc._setDefaults();
    // construct image quantizer
    let imageQuantizer;
    if (strategy === 'Nearest') {
      imageQuantizer = new image.NearestColor(distCalc);
    } else if (strategy === 'Riemersma') {
      imageQuantizer = new image.ErrorDiffusionRiemersma(distCalc);
    } else {
      // minColorDistance is a percentage
      let minColorDistance = 0;
      // eslint-disable-next-line no-prototype-builtins
      if (opts.hasOwnProperty('minColorDistance')) {
        const mcdNumber = Number(opts.minColorDistance);
        if (!Number.isNaN(mcdNumber)) {
          minColorDistance = mcdNumber / 100 * 0.2;
        }
      }

      imageQuantizer = new image.ErrorDiffusionArray(
        distCalc,
        image.ErrorDiffusionArrayKernel[strategy],
        // eslint-disable-next-line no-prototype-builtins
        opts.hasOwnProperty('serpentine') ? opts.serpentine : true,
        minColorDistance,
        !!opts.GIMPerror,
      );
    }
    // quantize
    const iterator = imageQuantizer.quantize(pointContainer, palette);
    const next = () => {
      try {
        const result = iterator.next();
        if (result.done) {
          resolve(createCanvasFromPointContainer(pointContainer));
        } else {
          if (result.value.pointContainer) {
            pointContainer = result.value.pointContainer;
          }
          if (opts.onProgress) {
            opts.onProgress(
              Math.floor(25 + result.value.progress * 3 / 4),
            );
          }
          setTimeout(next, 0);
        }
      } catch (error) {
        reject(error);
      }
    };
    setTimeout(next, 0);
  });
}

/*
 * quantize HTMLCanvas to palette
 * see quantizePointContainer for parameter meanings
 */
export function quantizeImage(colors, imageCanvas, opts) {
  const pointContainer = utils.PointContainer.fromHTMLCanvasElement(
    imageCanvas,
  );
  return quantizePointContainer(
    colors,
    pointContainer,
    opts,
  );
}
