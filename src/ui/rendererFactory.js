/*
 * Manage renderers and switch between them
 * A renderer will create it's own viewport and append it
 * to document.body.
 *
 */

import { t } from 'ttag';

import Renderer from './Renderer';
import Renderer2D from './Renderer2D';
import { pAlert } from '../store/actions';
import { isWebGL2Available } from '../core/utils';

const dummyRenderer = new Renderer();

let renderer = dummyRenderer;

function animationLoop() {
  renderer.render();
  window.requestAnimationFrame(animationLoop);
}
animationLoop();

export async function initRenderer(store, is3D) {
  renderer.destructor();
  if (is3D) {
    if (!isWebGL2Available()) {
      store.dispatch(pAlert(
        t`Canvas Error`,
        t`Can't render 3D canvas, do you have WebGL2 disabled?`,
        'error',
        'OK',
      ));
      renderer = dummyRenderer;
    } else {
      /* eslint-disable-next-line max-len */
      const module = await import(/* webpackChunkName: "voxel" */ './Renderer3D');
      const Renderer3D = module.default;
      renderer = new Renderer3D(store);
    }
  } else {
    renderer = new Renderer2D(store);
  }
  return renderer;
}

export function getRenderer() {
  return renderer;
}
