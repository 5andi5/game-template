import * as THREE from 'three';
import { CONFIG } from './config';
import type { Terrain } from './terrain';

const C = CONFIG.camera;

/** Third-person orbit camera that smoothly follows a target and stays above the terrain. */
export class CameraRig {
  yaw = 0;
  pitch: number = C.initialPitch;

  private readonly focus = new THREE.Vector3();
  private readonly desired = new THREE.Vector3();

  constructor(
    readonly camera: THREE.PerspectiveCamera,
    private readonly terrain: Terrain,
  ) {}

  rotate(dx: number, dy: number): void {
    this.yaw -= dx * C.lookSensitivity;
    this.pitch = THREE.MathUtils.clamp(this.pitch + dy * C.lookSensitivity, C.minPitch, C.maxPitch);
  }

  update(dt: number, target: THREE.Vector3, snap = false): void {
    const t = snap ? 1 : 1 - Math.exp(-C.followSharpness * dt);
    this.focus.lerp(target, t);

    const cosP = Math.cos(this.pitch);
    this.desired.set(
      this.focus.x + Math.sin(this.yaw) * cosP * C.distance,
      this.focus.y + Math.sin(this.pitch) * C.distance + 1.5,
      this.focus.z + Math.cos(this.yaw) * cosP * C.distance,
    );
    const minY = this.terrain.heightAt(this.desired.x, this.desired.z) + 1;
    if (this.desired.y < minY) this.desired.y = minY;

    this.camera.position.copy(this.desired);
    this.camera.lookAt(this.focus.x, this.focus.y + 1, this.focus.z);
  }
}
