import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { createRandom } from './random';

export interface TerrainOptions {
  seed: number;
  size: number;
  segments: number;
  waterLevel: number;
}

/**
 * Procedural heightmap terrain. `heightAt(x, z)` is the single source of truth
 * for ground height and is used by both the mesh and gameplay code.
 */
export class Terrain {
  readonly mesh: THREE.Mesh;
  readonly size: number;
  private readonly noise: (x: number, y: number) => number;

  constructor(private readonly opts: TerrainOptions) {
    this.size = opts.size;
    this.noise = createNoise2D(createRandom(opts.seed));
    this.mesh = this.buildMesh();
  }

  heightAt(x: number, z: number): number {
    // Fractal Brownian motion: several octaves of noise summed together.
    let amplitude = 1;
    let frequency = 0.006;
    let height = 0;
    for (let i = 0; i < 5; i++) {
      height += this.noise(x * frequency, z * frequency) * amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }
    // Flatten valleys, sharpen peaks.
    const shaped = Math.sign(height) * Math.pow(Math.abs(height), 1.4);
    // Keep the spawn area gentle and above water.
    const distFromCenter = Math.hypot(x, z);
    const spawnBlend = THREE.MathUtils.smoothstep(distFromCenter, 10, 60);
    return THREE.MathUtils.lerp(2, shaped * 28 + 3, spawnBlend);
  }

  normalAt(x: number, z: number, target = new THREE.Vector3()): THREE.Vector3 {
    const e = 0.5;
    const hx = this.heightAt(x + e, z) - this.heightAt(x - e, z);
    const hz = this.heightAt(x, z + e) - this.heightAt(x, z - e);
    return target.set(-hx, 2 * e, -hz).normalize();
  }

  private buildMesh(): THREE.Mesh {
    const { size, segments, waterLevel } = this.opts;
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(positions.count * 3);
    const color = new THREE.Color();
    const sand = new THREE.Color(0xd8c690);
    const grass = new THREE.Color(0x5f9e45);
    const forest = new THREE.Color(0x3d7a35);
    const rock = new THREE.Color(0x7d7468);
    const snow = new THREE.Color(0xf4f6f8);

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const y = this.heightAt(x, z);
      positions.setY(i, y);

      const h = y - waterLevel;
      if (h < 1.2) color.copy(sand);
      else if (h < 8) color.lerpColors(grass, forest, (h - 1.2) / 6.8);
      else if (h < 16) color.lerpColors(forest, rock, (h - 8) / 8);
      else if (h < 22) color.lerpColors(rock, snow, (h - 16) / 6);
      else color.copy(snow);

      colors.set([color.r, color.g, color.b], i * 3);
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.95,
      flatShading: true,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    return mesh;
  }
}

/** Scatter low-poly trees on grassy slopes using instancing (one draw call per part). */
export function createTrees(terrain: Terrain, count: number, seed: number, waterLevel: number): THREE.Group {
  const rand = createRandom(seed + 1);
  const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 1.6, 6).translate(0, 0.8, 0);
  const leavesGeo = new THREE.ConeGeometry(1.3, 3.2, 7).translate(0, 3, 0);
  const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: 0x6b4a2b }), count);
  const leaves = new THREE.InstancedMesh(
    leavesGeo,
    new THREE.MeshStandardMaterial({ color: 0x2f6b2f, flatShading: true }),
    count,
  );

  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const normal = new THREE.Vector3();
  const half = terrain.size / 2 - 5;

  let placed = 0;
  for (let attempts = 0; placed < count && attempts < count * 20; attempts++) {
    const x = (rand() * 2 - 1) * half;
    const z = (rand() * 2 - 1) * half;
    if (Math.hypot(x, z) < 15) continue; // keep spawn clear
    const y = terrain.heightAt(x, z);
    const h = y - waterLevel;
    if (h < 1.5 || h > 14) continue;
    if (terrain.normalAt(x, z, normal).dot(up) < 0.85) continue; // too steep

    const s = 0.7 + rand() * 0.8;
    quat.setFromAxisAngle(up, rand() * Math.PI * 2);
    matrix.compose(pos.set(x, y - 0.1, z), quat, scale.set(s, s, s));
    trunks.setMatrixAt(placed, matrix);
    leaves.setMatrixAt(placed, matrix);
    placed++;
  }
  trunks.count = leaves.count = placed;
  for (const m of [trunks, leaves]) {
    m.castShadow = true;
    m.receiveShadow = true;
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }

  const group = new THREE.Group();
  group.add(trunks, leaves);
  return group;
}
