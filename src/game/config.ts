/** Central tuning knobs. Tweak these first when starting a new game from the template. */
export const CONFIG = {
  world: {
    seed: 1337,
    size: 400, // world width/depth in units
    segments: 256, // terrain grid resolution
    waterLevel: 0,
    treeCount: 600,
  },
  player: {
    size: 1.5,
    color: 0xe8833a,
    maxSpeed: 14,
    sprintMultiplier: 1.8,
    acceleration: 60,
    friction: 10,
    jumpVelocity: 13,
    gravity: 35,
    turnSpeed: 10,
  },
  camera: {
    fov: 60,
    distance: 12,
    minPitch: -0.2,
    maxPitch: 1.2,
    initialPitch: 0.35,
    lookSensitivity: 0.005,
    followSharpness: 8,
  },
  colors: {
    sky: 0x9fc9e8,
    water: 0x2f7fb8,
  },
} as const;
