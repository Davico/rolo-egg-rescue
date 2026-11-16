# Rolo: Egg Rescue

A 2D physics platformer for the web (CrazyGames / Poki first, then Google Play and the App Store through Capacitor).
Rolo the armadillo rolls to the owl's nest, grabs the egg and has to make it home while the owl chases him.
The egg gives a power on the way back, the level changes on the return trip, and every rescued egg hatches into a pet.

## Run it

```bash
npm install
npm run dev        # play at http://localhost:5173
npm run build      # production build in dist/ (relative paths: works on portals and inside Capacitor)
npm test           # a bot plays every built-in level, with starting powers and with maxed powers
npm run levels     # regenerate the seed levels in src/levels/w1 from tools/gen-levels.mjs
```

## How it is built

| Path | What |
| --- | --- |
| `src/core/` | Pure simulation: no DOM, no canvas, no audio. `createSim(level, powers)` + `step(sim, input, dt)`. Talks to the outside only through `events.ts`. |
| `src/render.ts` | Canvas 2D drawing of the world, HUD and shared sprites. |
| `src/ui.ts` | Menu and hatch screens. |
| `src/editor.ts` | In-game level maker: tile painter, autosave, share codes (`ROLO1.…`). |
| `src/audio.ts` | Synthesized WebAudio sound effects and music (no audio files). |
| `src/levels/` | Levels as JSON tile grids. The legend is in `src/core/types.ts`. |
| `tools/bot.ts` | Headless playtest bot (look-ahead over a platformer nav graph). |
| `tools/gen-levels.mjs` | Builds the seed levels from reusable pieces. |

Controls: arrows or A/D to roll, Up/W/Space to jump, X or Shift to dash, Esc for the menu. Touch buttons appear on phones.
