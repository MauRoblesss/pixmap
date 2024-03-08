/*
 * 3D Renderer for VoxelCanvas
 *
 */

import * as THREE from 'three';
import Sky from './Sky';

import InfiniteGridHelper from './InfiniteGridHelper';
import VoxelPainterControls from '../controls/VoxelPainterControls';
import Renderer from './Renderer';
import ChunkLoader from './ChunkLoader3D';
import {
  getChunkOfPixel,
  getOffsetOfPixel,
} from '../core/utils';
import {
  THREE_TILE_SIZE,
} from '../core/constants';
import {
  setHover,
  selectColor,
} from '../store/actions';
import pixelTransferController from './PixelTransferController';

const renderDistance = 150;

class Renderer3D extends Renderer {
  is3D = true;
  //--
  scene;
  camera;
  rollOverMesh;
  objects;
  loadedChunks;
  plane;
  oobGeometry;
  oobMaterial;
  //--
  controls;
  threeRenderer;
  // temp variables for mouse events
  mouse;
  mouseMoveStart;
  raycaster;
  pressTime;
  pressCdTime;
  multitap;
  //--
  forceNextRender = false;

  constructor(store) {
    super(store);
    const state = store.getState();
    this.objects = [];

    // camera
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      1,
      400,
    );
    camera.position.set(10, 16, 26);
    camera.lookAt(0, 0, 0);
    this.camera = camera;

    // scene
    const scene = new THREE.Scene();
    // scene.background = new THREE.Color(0xf0f0f0);
    this.scene = scene;

    // lights
    const ambientLight = new THREE.AmbientLight(0x222222);
    scene.add(ambientLight);

    // const directionalLight = new THREE.DirectionalLight(0xffffff);
    // directionalLight.position.set(1, 1.2, 0.8).normalize();
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(80, 80, 75);
    const contourLight = new THREE.DirectionalLight(0xffffff, 0.4);
    contourLight.position.set(-80, 80, -75);
    scene.add(directionalLight);
    scene.add(contourLight);

    const sky = new Sky();
    sky.scale.setScalar(450000);
    scene.add(sky);

    scene.fog = new THREE.FogExp2(0xffffff, 0.003);

    const effectController = {
      turbidity: 10,
      rayleigh: 2,
      mieCoefficient: 0.005,
      mieDirectionalG: 0.8,
      inclination: 0.49, // elevation / inclination
      azimuth: 0.25, // Facing front,
      sun: !true,
    };
    const { uniforms } = sky.material;
    uniforms.turbidity.value = effectController.turbidity;
    uniforms.rayleigh.value = effectController.rayleigh;
    uniforms.mieCoefficient.value = effectController.mieCoefficient;
    uniforms.mieDirectionalG.value = effectController.mieDirectionalG;
    uniforms.sunPosition.value.set(400000, 400000, 400000);

    // hover helper
    const rollOverGeo = new THREE.BoxBufferGeometry(1, 1, 1);
    const rollOverMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      opacity: 0.5,
      transparent: true,
    });
    this.rollOverMesh = new THREE.Mesh(rollOverGeo, rollOverMaterial);
    scene.add(this.rollOverMesh);

    // grid
    // const gridHelper = new THREE.GridHelper(100, 10, 0x555555, 0x555555);
    const gridHelper = new InfiniteGridHelper(1, 10);
    scene.add(gridHelper);

    //
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.multitap = 0;

    // Plane Floor
    const geometry = new THREE.PlaneBufferGeometry(1024, 1024);
    geometry.rotateX(-Math.PI / 2);
    const plane = new THREE.Mesh(
      geometry,
      new THREE.MeshLambertMaterial({ color: 0xcae3ff }),
    );
    scene.add(plane);
    this.plane = plane;
    this.objects.push(plane);
    this.plane.position.y = -0.1;

    // Out of bounds plane
    const oobGeometry = new THREE.PlaneBufferGeometry(
      THREE_TILE_SIZE,
      THREE_TILE_SIZE,
    );
    oobGeometry.rotateX(-Math.PI / 2);
    oobGeometry.translate(THREE_TILE_SIZE / 2, 0.2, THREE_TILE_SIZE / 2);
    const oobMaterial = new THREE.MeshLambertMaterial({
      color: '#C4C4C4',
    });
    this.oobGeometry = oobGeometry;
    this.oobMaterial = oobMaterial;

    // renderer
    const threeRenderer = new THREE.WebGLRenderer({
      preserveDrawingBuffer: true,
    });
    threeRenderer.setPixelRatio(window.devicePixelRatio);
    threeRenderer.setSize(window.innerWidth, window.innerHeight);
    const { domElement } = threeRenderer;
    domElement.className = 'viewport';
    document.body.appendChild(domElement);
    this.threeRenderer = threeRenderer;

    // controls
    const controls = new VoxelPainterControls(
      camera,
      domElement,
      store,
    );
    controls.enableDamping = true;
    controls.dampingFactor = 0.10;
    controls.maxPolarAngle = Math.PI / 2;
    controls.minDistance = 10.00;
    controls.maxDistance = 100.00;
    this.controls = controls;


    this.onDocumentMouseMove = this.onDocumentMouseMove.bind(this);
    this.onDocumentTouchMove = this.onDocumentTouchMove.bind(this);
    // eslint-disable-next-line max-len
    this.onDocumentMouseDownOrTouchStart = this.onDocumentMouseDownOrTouchStart.bind(this);
    this.onDocumentMouseUp = this.onDocumentMouseUp.bind(this);
    this.onWindowResize = this.onWindowResize.bind(this);
    this.onDocumentTouchEnd = this.onDocumentTouchEnd.bind(this);
    this.multiTapEnd = this.multiTapEnd.bind(this);
    domElement.addEventListener('mousemove', this.onDocumentMouseMove, false);
    domElement.addEventListener('touchmove', this.onDocumentTouchMove, false);
    domElement.addEventListener(
      'mousedown',
      this.onDocumentMouseDownOrTouchStart,
      false,
    );
    domElement.addEventListener(
      'touchstart',
      this.onDocumentMouseDownOrTouchStart,
      false,
    );
    domElement.addEventListener('touchend', this.onDocumentTouchEnd, false);
    domElement.addEventListener('mouseup', this.onDocumentMouseUp, false);
    window.addEventListener('resize', this.onWindowResize, false);

    this.updateCanvasData(state);
  }

  destructor() {
    window.removeEventListener('resize', this.onWindowResize, false);
    this.threeRenderer.dispose();
    this.controls.dispose();
    const { domElement } = this.threeRenderer;
    this.threeRenderer = null;
    domElement.remove();
    super.destructor();
  }

  updateView() {
    this.forceNextRender = true;
  }

  getViewport() {
    return this.threeRenderer.domElement;
  }

  updateCanvasData(state) {
    const {
      canvasId,
      view,
    } = state.canvas;
    if (canvasId !== this.canvasId) {
      this.canvasId = canvasId;
      if (canvasId !== null) {
        if (this.chunkLoader) {
          // destroy old chunks,
          // meshes need to get disposed
          if (this.loadedChunks) {
            this.loadedChunks.forEach((chunk) => {
              this.scene.remove(chunk);
              this.objects = [this.plane];
            });
            this.chunkLoader.destructor();
          }
        }
        this.loadedChunks = new Map();
        const {
          palette,
          canvasSize,
        } = state.canvas;
        this.chunkLoader = new ChunkLoader(
          this.store,
          canvasId,
          palette,
          canvasSize,
        );
      }
    }
    this.controls.setView(view);
    this.forceNextRender = true;
  }

  // eslint-disable-next-line class-methods-use-this
  updateScale() {
    return null;
  }

  renderPixel(
    i,
    j,
    offset,
    color,
  ) {
    const { chunkLoader } = this;
    if (chunkLoader) {
      chunkLoader.getVoxelUpdate(i, j, offset, color);
    }
  }

  isChunkInView(yc, xc, zc) {
    const chunkKey = `${xc}:${zc}`;
    if (this.loadedChunks.has(chunkKey)) {
      return true;
    }
    return false;
  }

  reloadChunks() {
    if (!this.chunkLoader) {
      return;
    }
    const state = this.store.getState();
    const {
      canvasSize,
      view,
    } = state.canvas;
    const x = view[0];
    const z = view[2] || 0;
    const {
      scene,
      loadedChunks,
      chunkLoader,
    } = this;
    const [xcMin, zcMin] = getChunkOfPixel(
      canvasSize,
      x - renderDistance,
      0,
      z - renderDistance,
    );
    const [xcMax, zcMax] = getChunkOfPixel(
      canvasSize,
      x + renderDistance,
      0,
      z + renderDistance,
    );
    const chunkMaxXY = canvasSize / THREE_TILE_SIZE;
    // console.log(`Get ${xcMin} - ${xcMax} - ${zcMin} - ${zcMax}`);
    const curLoadedChunks = [];
    for (let zc = zcMin; zc <= zcMax; ++zc) {
      for (let xc = xcMin; xc <= xcMax; ++xc) {
        const chunkKey = `${xc}:${zc}`;
        curLoadedChunks.push(chunkKey);
        if (!loadedChunks.has(chunkKey)) {
          let chunk = null;
          if (xc < 0 || zc < 0 || xc >= chunkMaxXY || zc >= chunkMaxXY) {
            // if out of bounds
            chunk = new THREE.Mesh(this.oobGeometry, this.oobMaterial);
          } else {
            chunk = chunkLoader.getChunk(xc, zc, true);
          }
          if (chunk) {
            loadedChunks.set(chunkKey, chunk);
            chunk.position.fromArray([
              xc * THREE_TILE_SIZE - canvasSize / 2,
              0,
              zc * THREE_TILE_SIZE - canvasSize / 2,
            ]);
            scene.add(chunk);
          }
        }
      }
    }
    const newObjects = [this.plane];
    loadedChunks.forEach((chunk, chunkKey) => {
      if (curLoadedChunks.includes(chunkKey)) {
        newObjects.push(chunk);
      } else {
        scene.remove(chunk);
        loadedChunks.delete(chunkKey);
      }
    });
    this.plane.position.x = x;
    this.plane.position.z = z;
    this.objects = newObjects;
  }

  render() {
    if (!this.threeRenderer) {
      return;
    }
    this.controls.update();
    if (this.forceNextRender) {
      this.reloadChunks();
      this.forceNextRender = false;
    }
    this.threeRenderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.threeRenderer.setSize(window.innerWidth, window.innerHeight);
  }

  onDocumentMouseMove(event) {
    event.preventDefault();
    const {
      clientX,
      clientY,
    } = event;
    const {
      innerWidth,
      innerHeight,
    } = window;
    const {
      camera,
      objects,
      raycaster,
      mouse,
      rollOverMesh,
      store,
    } = this;
    const {
      fetchingPixel,
    } = store.getState().fetching;

    mouse.set(
      (clientX / innerWidth) * 2 - 1,
      -(clientY / innerHeight) * 2 + 1,
    );

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(objects);
    if (intersects.length > 0) {
      const intersect = intersects[0];
      const target = intersect.point.clone()
        .add(intersect.face.normal.multiplyScalar(0.5))
        .floor()
        .addScalar(0.5);
      if (fetchingPixel
        || target.clone().sub(camera.position).length() > 120) {
        rollOverMesh.position.y = -10;
      } else {
        rollOverMesh.position.copy(target);
        const hover = target
          .toArray().map((u) => Math.floor(u));
        this.store.dispatch(setHover(hover));
      }
    }
  }

  onDocumentMouseDownOrTouchStart() {
    this.pressTime = Date.now();
    const state = this.store.getState();
    this.mouseMoveStart = state.canvas.hover;
  }

  onDocumentTouchMove() {
    const {
      camera,
      objects,
      raycaster,
      mouse,
      rollOverMesh,
      store,
    } = this;
    const {
      fetchingPixel,
    } = store.getState().fetching;

    mouse.set(0, 0);
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(objects);
    if (intersects.length > 0) {
      const intersect = intersects[0];
      const target = intersect.point.clone()
        .add(intersect.face.normal.multiplyScalar(0.5))
        .floor()
        .addScalar(0.5);
      // TODO make rollOverMesh in a different color while fetchingPixel
      // instead of hiding it.... we can now queue Voxels
      if (fetchingPixel
        || target.clone().sub(camera.position).length() > 50) {
        rollOverMesh.position.y = -10;
      } else {
        rollOverMesh.position.copy(target);
        const hover = target
          .toArray().map((u) => Math.floor(u));
        this.store.dispatch(setHover(hover));
      }
    }
  }

  placeVoxel(x, y, z, color = null) {
    const {
      store,
    } = this;
    const state = store.getState();
    const {
      canvasSize,
      selectedColor,
    } = state.canvas;
    const chClr = (color === null) ? selectedColor : color;
    const curColor = (chClr === 0) ? this.chunkLoader.getVoxel(x, y, z) : 0;
    const [i, j] = getChunkOfPixel(canvasSize, x, y, z);
    const offset = getOffsetOfPixel(canvasSize, x, y, z);
    pixelTransferController.tryPlacePixel(
      i, j,
      offset,
      chClr,
      curColor,
    );
  }

  multiTapEnd() {
    const {
      store,
      mouseMoveStart,
      multitap,
    } = this;
    this.multitap = 0;
    const state = store.getState();

    const [px, py, pz] = mouseMoveStart;
    const [qx, qy, qz] = state.canvas.hover;
    if (px !== qx || py !== qy || pz !== qz) {
      return;
    }

    switch (multitap) {
      case 1: {
        // single tap
        // Place Voxel
        if (this.rollOverMesh.position.y < 0) {
          return;
        }
        this.placeVoxel(px, py, pz);
        break;
      }
      case 2: {
        // double tap
        // Remove Voxel
        const {
          mouse,
          raycaster,
          camera,
          objects,
        } = this;
        mouse.set(0, 0);
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(objects);
        if (intersects.length > 0) {
          const intersect = intersects[0];
          const target = intersect.point.clone()
            .add(intersect.face.normal.multiplyScalar(-0.5))
            .floor()
            .addScalar(0.5)
            .floor();
          if (target.y < 0) {
            return;
          }
          if (target.clone().sub(camera.position).length() <= 50) {
            const [x, y, z] = target.toArray();
            this.placeVoxel(x, y, z, 0);
          }
        }
        break;
      }
      default:
        break;
    }
  }

  onDocumentTouchEnd(event) {
    event.preventDefault();

    const curTime = Date.now();
    if (curTime - this.pressTime > 600) {
      this.multitap = 0;
      return;
    }
    // if we want to do something with triple tap,
    // we should reset on every tap
    // but we don't need that right now...
    if (this.multitap === 0) {
      setTimeout(this.multiTapEnd, 500);
    }
    this.multitap += 1;
  }

  onDocumentMouseUp(event) {
    const curTime = Date.now();
    if (curTime - this.pressCdTime < 200) {
      return;
    }
    if (curTime - this.pressTime > 500) {
      this.pressCdTime = curTime;
      return;
    }

    const state = this.store.getState();
    const {
      isOnMobile,
    } = state.user;
    const {
      fetchingPixel,
    } = state.fetching;
    if (fetchingPixel || isOnMobile) {
      return;
    }

    const [px, py, pz] = this.mouseMoveStart;
    const [qx, qy, qz] = state.canvas.hover;
    if (px !== qx || py !== qy || pz !== qz) {
      return;
    }

    event.preventDefault();
    const {
      clientX,
      clientY,
      button,
    } = event;
    const {
      innerWidth,
      innerHeight,
    } = window;
    const {
      camera,
      objects,
      raycaster,
      mouse,
      store,
    } = this;

    mouse.set(
      (clientX / innerWidth) * 2 - 1,
      -(clientY / innerHeight) * 2 + 1,
    );

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(objects);
    if (intersects.length > 0) {
      const intersect = intersects[0];

      if (button === 0) {
        // left mouse button
        const target = intersect.point.clone()
          .add(intersect.face.normal.multiplyScalar(0.5))
          .floor()
          .addScalar(0.5)
          .floor();
        if (target.clone().sub(camera.position).length() < 120) {
          const [x, y, z] = target.toArray();
          this.placeVoxel(x, y, z);
        }
      } else if (button === 1) {
        // middle mouse button
        const target = intersect.point.clone()
          .add(intersect.face.normal.multiplyScalar(-0.5))
          .floor()
          .addScalar(0.5)
          .floor();
        if (target.y < 0) {
          return;
        }
        if (target.clone().sub(camera.position).length() < 120) {
          const cell = target.toArray();
          if (this.chunkLoader) {
            const clr = this.chunkLoader.getVoxel(...cell);
            if (clr) {
              store.dispatch(selectColor(clr));
            }
          }
        }
      } else if (button === 2) {
        // right mouse button
        const target = intersect.point.clone()
          .add(intersect.face.normal.multiplyScalar(-0.5))
          .floor()
          .addScalar(0.5)
          .floor();
        if (target.y < 0) {
          return;
        }
        if (target.clone().sub(camera.position).length() < 120) {
          const [x, y, z] = target.toArray();
          this.placeVoxel(x, y, z, 0);
        }
      }
    }
  }
}

export default Renderer3D;
