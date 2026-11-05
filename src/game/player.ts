import * as THREE from 'three';
import { CONFIG } from './config';
import type { Terrain } from './terrain';
import type { Input } from './input';

const C = CONFIG.player;

/** The player-controlled cube: horizontal movement relative to the camera, gravity and jumping. */
export class Player {
  readonly mesh: THREE.Mesh;
  readonly velocity = new THREE.Vector3();
  grounded = false;

  private heading = 0;
  private readonly forward = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly wish = new THREE.Vector3();

  constructor(private readonly terrain: Terrain) {
    const geometry = new THREE.BoxGeometry(C.size, C.size, C.size);
    const material = new THREE.MeshStandardMaterial({ color: C.color, roughness: 0.5 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.position.set(0, this.groundHeight(0, 0), 0);
  }

  get position(): THREE.Vector3 {
    return this.mesh.position;
  }

  update(dt: number, input: Input, cameraYaw: number): void {
    // Camera-relative movement direction on the XZ plane.
    this.forward.set(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
    this.right.set(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw));
    this.wish
      .copy(this.forward)
      .multiplyScalar(input.move.y)
      .addScaledVector(this.right, input.move.x);

    const maxSpeed = C.maxSpeed * (input.sprint ? C.sprintMultiplier : 1);
    const targetX = this.wish.x * maxSpeed;
    const targetZ = this.wish.z * maxSpeed;
    const hasInput = this.wish.lengthSq() > 0.0001;
    const rate = (hasInput ? C.acceleration : C.friction * maxSpeed) * dt;
    this.velocity.x = approach(this.velocity.x, targetX, rate);
    this.velocity.z = approach(this.velocity.z, targetZ, rate);

    // Gravity and jumping.
    if (this.grounded && input.consumeJump()) {
      this.velocity.y = C.jumpVelocity;
      this.grounded = false;
    }
    this.velocity.y -= C.gravity * dt;

    const pos = this.mesh.position;
    pos.addScaledVector(this.velocity, dt);

    // Keep inside world bounds.
    const limit = this.terrain.size / 2 - C.size * 2;
    pos.x = THREE.MathUtils.clamp(pos.x, -limit, limit);
    pos.z = THREE.MathUtils.clamp(pos.z, -limit, limit);

    // Ground collision.
    const ground = this.groundHeight(pos.x, pos.z);
    if (pos.y <= ground) {
      pos.y = ground;
      this.velocity.y = Math.max(0, this.velocity.y);
      this.grounded = true;
    } else {
      this.grounded = pos.y - ground < 0.05;
    }

    // Rotate to face the direction of travel.
    const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (horizontalSpeed > 0.5) {
      const target = Math.atan2(this.velocity.x, this.velocity.z);
      this.heading = lerpAngle(this.heading, target, 1 - Math.exp(-C.turnSpeed * dt));
    }
    this.mesh.rotation.set(0, this.heading, 0);
    // Discard jump presses made while airborne so they don't fire on landing.
    if (!this.grounded) input.consumeJump();
  }

  /** Height of the cube's center when resting on terrain (or floating on water). */
  private groundHeight(x: number, z: number): number {
    const surface = Math.max(this.terrain.heightAt(x, z), CONFIG.world.waterLevel - C.size * 0.3);
    return surface + C.size / 2;
  }
}

function approach(current: number, target: number, maxDelta: number): number {
  if (current < target) return Math.min(current + maxDelta, target);
  return Math.max(current - maxDelta, target);
}

function lerpAngle(a: number, b: number, t: number): number {
  const delta = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + delta * t;
}
