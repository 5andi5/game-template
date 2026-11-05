import './style.css';
import * as THREE from 'three';
import { CONFIG } from './game/config';
import { Terrain, createTrees } from './game/terrain';
import { Input } from './game/input';
import { Player } from './game/player';
import { CameraRig } from './game/cameraRig';

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;

// --- Renderer -------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

// --- Scene ----------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(CONFIG.colors.sky);
scene.fog = new THREE.Fog(CONFIG.colors.sky, 60, 220);

const camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, window.innerWidth / window.innerHeight, 0.1, 1000);

scene.add(new THREE.HemisphereLight(0xdbeeff, 0x4a5a3a, 1.2));
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = sun.shadow.camera.bottom = -40;
sun.shadow.camera.right = sun.shadow.camera.top = 40;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 200;
sun.shadow.bias = -0.0005;
const sunOffset = new THREE.Vector3(40, 80, 25);
scene.add(sun, sun.target);

// --- World ----------------------------------------------------------------
const { world } = CONFIG;
const terrain = new Terrain(world);
scene.add(terrain.mesh);
scene.add(createTrees(terrain, world.treeCount, world.seed, world.waterLevel));

const water = new THREE.Mesh(
  new THREE.PlaneGeometry(world.size * 3, world.size * 3).rotateX(-Math.PI / 2),
  new THREE.MeshStandardMaterial({ color: CONFIG.colors.water, transparent: true, opacity: 0.75, roughness: 0.2 }),
);
water.position.y = world.waterLevel;
water.receiveShadow = true;
scene.add(water);

// --- Gameplay -------------------------------------------------------------
const input = new Input(canvas);
const player = new Player(terrain);
scene.add(player.mesh);
const rig = new CameraRig(camera, terrain);
rig.update(0, player.position, true);

// --- Loop -----------------------------------------------------------------
const timer = new THREE.Timer();
timer.connect(document); // pauses delta while the tab is hidden
renderer.setAnimationLoop((time) => {
  timer.update(time);
  // Clamp: never negative (first frame), never huge (avoids tunneling after hitches).
  const dt = THREE.MathUtils.clamp(timer.getDelta(), 0, 1 / 20);

  input.update();
  const look = input.consumeLook();
  rig.rotate(look.dx, look.dy);
  player.update(dt, input, rig.yaw);
  rig.update(dt, player.position);

  // Shadow camera follows the player so shadows stay crisp everywhere.
  sun.target.position.copy(player.position);
  sun.position.copy(player.position).add(sunOffset);

  renderer.render(scene, camera);
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Expose for debugging in the browser console during development.
if (import.meta.env.DEV) {
  Object.assign(window, { THREE, scene, player, terrain, rig });
}
