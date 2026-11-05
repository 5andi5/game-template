# game-template

Template repository for browser 3D games built with [Three.js](https://threejs.org/) + [Vite](https://vite.dev/) + TypeScript.
Every push to `main` is built and published to GitHub Pages, so anyone can play the latest version in their browser.

**Play:** https://5andi5.github.io/game-template/

The starter game: an orange cube you can drive around a procedurally generated landscape (hills, lake, trees).

| Input | Action |
| --- | --- |
| WASD / arrow keys | Move (relative to camera) |
| Shift | Sprint |
| Space | Jump |
| Mouse drag | Rotate camera |
| Touch: left half | Virtual joystick |
| Touch: right half | Drag to look, tap to jump |

## Development

Requires Node 20.19+ (see `.nvmrc`).

```sh
npm install
npm run dev        # dev server with hot reload, opens http://localhost:5173
npm run build      # typecheck + production build into dist/
npm run preview    # serve the production build locally
```

In dev mode `scene`, `player`, `terrain`, `rig` and `THREE` are exposed on `window` for console debugging.

## Project layout

```
index.html              page shell + HUD
src/main.ts             renderer, scene, lights, game loop
src/game/config.ts      tuning knobs (world seed/size, player speed, camera…)
src/game/terrain.ts     noise heightmap terrain (heightAt/normalAt) + instanced trees
src/game/player.ts      cube movement, gravity, jumping, ground collision
src/game/cameraRig.ts   third-person follow camera
src/game/input.ts       keyboard / mouse / touch input
public/                 static assets copied as-is (models, textures, audio)
.github/workflows/      GitHub Pages deployment
```

## Starting a new game from this template

1. Fork the repo (or use **Use this template** after marking it as a template in Settings) and give it a new name.
2. In the new repo go to **Settings → Pages → Build and deployment** and set **Source** to **GitHub Actions**.
3. If you forked it, open the **Actions** tab and enable workflows (GitHub disables them on forks by default).
4. Push to `main`; the game appears at `https://<user>.github.io/<repo-name>/`.

The Vite `base` is relative (`./`), so no path config is needed whatever the repo is called.
Put assets in `public/` and reference them with relative URLs (e.g. `./models/ship.glb`) so they resolve under the Pages subpath.
