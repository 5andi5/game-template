/**
 * Unified keyboard / mouse / touch input.
 *
 * - Keyboard: WASD or arrows to move, Space to jump, Shift to sprint.
 * - Mouse: drag (any button) to rotate the camera.
 * - Touch: left half of the screen is a virtual joystick, right half rotates the
 *   camera; a quick tap on the right half jumps.
 */
export class Input {
  /** Movement intent in camera space: x = right, y = forward. Length is 0..1. */
  readonly move = { x: 0, y: 0 };
  sprint = false;

  private readonly keys = new Set<string>();
  private jumpQueued = false;
  private lookDX = 0;
  private lookDY = 0;

  private joystick: { id: number; startX: number; startY: number; x: number; y: number } | null = null;
  private lookPointers = new Map<number, { x: number; y: number; startX: number; startY: number; time: number }>();

  constructor(private readonly element: HTMLElement) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', () => this.keys.clear());
    element.addEventListener('pointerdown', this.onPointerDown);
    element.addEventListener('pointermove', this.onPointerMove);
    element.addEventListener('pointerup', this.onPointerUp);
    element.addEventListener('pointercancel', this.onPointerUp);
    element.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** Call once per frame before reading state. */
  update(): void {
    let x = 0;
    let y = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;

    if (this.joystick) {
      const radius = 60;
      x += (this.joystick.x - this.joystick.startX) / radius;
      y -= (this.joystick.y - this.joystick.startY) / radius;
    }

    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    this.move.x = x;
    this.move.y = y;
    this.sprint = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
  }

  /** Returns true once per jump press. */
  consumeJump(): boolean {
    const j = this.jumpQueued;
    this.jumpQueued = false;
    return j;
  }

  /** Returns accumulated look delta in pixels since the last call. */
  consumeLook(): { dx: number; dy: number } {
    const d = { dx: this.lookDX, dy: this.lookDY };
    this.lookDX = this.lookDY = 0;
    return d;
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      if (!e.repeat) this.jumpQueued = true;
      e.preventDefault();
    }
    if (e.code.startsWith('Arrow')) e.preventDefault();
    this.keys.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onPointerDown = (e: PointerEvent) => {
    this.element.setPointerCapture(e.pointerId);
    const isTouch = e.pointerType === 'touch';
    if (isTouch && !this.joystick && e.clientX < window.innerWidth / 2) {
      this.joystick = { id: e.pointerId, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY };
    } else {
      this.lookPointers.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
        startX: e.clientX,
        startY: e.clientY,
        time: performance.now(),
      });
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    if (this.joystick?.id === e.pointerId) {
      this.joystick.x = e.clientX;
      this.joystick.y = e.clientY;
      return;
    }
    const p = this.lookPointers.get(e.pointerId);
    if (p) {
      this.lookDX += e.clientX - p.x;
      this.lookDY += e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
    }
  };

  private onPointerUp = (e: PointerEvent) => {
    if (this.joystick?.id === e.pointerId) {
      this.joystick = null;
      return;
    }
    const p = this.lookPointers.get(e.pointerId);
    if (p) {
      const isTap =
        e.pointerType === 'touch' &&
        performance.now() - p.time < 250 &&
        Math.hypot(e.clientX - p.startX, e.clientY - p.startY) < 12;
      if (isTap) this.jumpQueued = true;
      this.lookPointers.delete(e.pointerId);
    }
  };
}
