# Notes for working on this repo

- TypeScript strict, Vite, no runtime dependencies. Keep it that way: the whole game is ~30 KB gzipped.
- `src/core` must stay free of DOM/canvas/audio so the bot can run it in Node. Side effects go through `ev()` in `core/events.ts`.
- The simulation runs at a fixed 120 Hz step. Never use frame time inside `core`.
- Levels are tile grids (legend in `core/types.ts`). A new mechanic = a new tile character: add it to `createSim`/`step`, draw it in `render.ts`, add a palette entry in `editor.ts` (and to `ALLOWED`), teach `tools/bot.ts` if it blocks the route.
- After any change to physics or levels run `npm test`; every built-in level has to pass with starting and with maxed powers.
- Design rule: every level introduces one new idea or a new combination. No two neighbouring levels with the same core obstacle.
- Game text is English, short, for kids who can barely read. Never add anything that pressures kids to pay or watch ads.
