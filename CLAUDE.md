# Ragged Crown

A turn-based, top-down retro RPG in the style of Ultima 3-5 and Magic Candle: a 16-colour palette, keyboard-driven, played in the browser. React 19 + TypeScript + Vite, Zustand for state. No backend: content is static JSON in `public/data/`, and player data (characters, saves) lives in the browser's localStorage. Solo project, localhost only.

The content (tiles, objects, items, zones, sprites) is authored in the sibling repo `ragged-crown-tools` (`../ragged-crown-tools`). Its `DATA-MODEL.md` is the source of truth for the content model; this game conforms to it, and is currently behind it (see "Shared types").

@ARCHITECTURE.md

The architecture doc describes the code as it is. Its "Known gaps" section is the owner's list: do not fix items from it unless asked.

## How to work with me

I'm an experienced developer (25+ years) who still wants to write code and keep learning. I'm deliberate and a bit stubborn, and I'll change my mind when given a reason.

- **Explain why.** Give the reasoning and the trade-off, not just a verdict. Say when something is only taste.
- **Small, controllable steps.** Prefer a minimal change I can read and test over a large rewrite. Divide and conquer. Build MVPs and see how they feel.
- **Solve the problem in front of us.** Don't refactor, rename, or "clean up" code I didn't ask about. Don't add abstractions for hypothetical future needs. If you notice something that will actually block the current work, mention it briefly and let me decide.
- **Show the diff, don't bury it.** I read every change. Keep edits focused so they're reviewable.
- **Placeholders are intentional.** Copied-over code, stubs and `// TODO` notes are often reminders to myself. Leave them alone unless they're in the way.
- **Say when you're unsure or wrong.** Verify against the code instead of guessing, and tell me when you haven't been able to run something.
- **Keep answers proportionate.** Short question, short answer. I tire easily, so don't pad.

## Safety rules

- Never run destructive commands without asking first: `rm` in any form, `git reset --hard`, `git clean`, force pushes.
- Don't commit or push. I do that myself.
- Don't install or upgrade dependencies without asking.
- Don't clear or rewrite the browser's localStorage data for the game (saved characters and games) without asking.
- Scratch files (throwaway scripts, checks, rendered images, saved responses) go in `.sandbox/` at the repo root, never in `/tmp` or elsewhere in the repo. `.sandbox/` is gitignored at any depth and ESLint skips it. Say when you add a file there. Don't delete anything in it; I clear it.

## Commands

pnpm only, never npm.

```bash
pnpm dev              # http://localhost:5173
pnpm exec tsc -b      # type check (the project uses references: tsconfig.app.json, tsconfig.node.json)
pnpm lint
pnpm format           # prettier --write over ts, tsx, json, css
```

Verify changes with `tsc -b` and `pnpm lint`. Both pass cleanly today.

## Game design that shapes the code

- **Characters start at level 0** with mediocre attributes, as in the AD&D module _Treasure Hunt_: the class is chosen later in play. There are no races or classes in character creation on purpose (race defaults to human). The `Race`, `ClassType` and `SpellCaster` types are leftovers from the first prototype, not unfinished work.
- **The party is capped at 4** (hard-coded in `PartyRosterScreen` for now).
- **Story start:** young teens in a peaceful village; a strange figure and his minion kill the village elder (one character's father). The intro is the `intro` sequence in `public/data/dialogs/starter_town.json`.
- **Modes:** the game waits for keyboard input and behaves differently per screen or mode (world map, combat, cut scene, character screens). `currentScreen` in `useGameStore` selects what `App.tsx` renders.
- **Combat** works to a limited degree: set damage, a few random encounters from the tile's `encounterRate` times the zone's `dangerLevel`, hard-coded monsters (`public/data/monster.json`). No inventory yet.
- `public/data/maps/a1.json` is the old prototype map and is deliberately unreferenced. `starter_town.json` is a small test grid.

## Code structure

```
src/
  engine/       GameEngine (singleton, lifecycle via BaseGameEngine), CombatEngine,
                InteractionEngine (moves, tile events), InputManager, CharacterEngine,
                commands/ (command objects built by CommandFactory)
  store/        Zustand stores: useGameStore, useCharacterCreationStore, useDialogStore
  services/     JSON loaders (maps, tiles, dialogs, monsters) and localStorage services
  components/   layout/ (one component per screen), map/, encounter/, cutscene/, ...
  types/        shared and game-only types
  constants/    tiles, player defaults, styles
  utils/
```

- Import with the `@/` alias and from the barrels (`@/types`, `@/engine`, `@/services`, `@/constants`, `@/utils`) like the existing code does.
- Engines are singletons reached through `getGameEngine()`, `getInteractionEngine()` and so on; they read and write the Zustand stores directly with `getState()` / `setState()`.
- Key input goes through `inputManager.registerHandler`, which returns an unbind function. The newest handler sees a key first; returning `true` stops it there.
- Use `cn()` from `@/utils` for class merging, and CVA for variants.

## Shared types

The content types are not copied: import them from the tools repo with `import type { ... } from '@shared/types'` (a `paths` alias in `tsconfig.app.json` to `../ragged-crown-tools/frontend/src/lib/types/shared.ts`, which re-exports `core.ts`, `defs.ts`, `interactions.ts`, `map.ts`). There is no shared package, on purpose ([Game 10]). Rules: always `import type` (Vite never resolves the alias, so a value import would break the build); the shared files stay types-only, so runtime helpers such as `cellKey()` and the colour palette are copied into this repo; after a type changes in the tools, run `pnpm exec tsc -b` here too. This needs the two repos side by side (`~/code/`). **Not migrated yet**: `src/types/map.ts` is still the old model (flat `TileDef` with `symbol`/`color`/`bg`, `T001` keys, `tileEvents` / `ActionPayload`). Porting it to the tools' model is planned work ([Game 1]); old types are replaced as the code using them is ported. Shared types are edited in the tools repo, never here.

## Conventions

**Formatting** (Prettier, `.prettierrc.cjs`, with the Tailwind plugin): tabs, single quotes, single quotes in JSX, no semicolons, trailing commas, 80 columns. ESLint runs Prettier as a rule, so `pnpm lint` reports formatting too.

**Stack versions that trip people up:** React 19, Tailwind v4 (via `@tailwindcss/vite`), Vite 8, TypeScript 6, Zustand 5. Tile colours are stored as Tailwind class strings in data. Tailwind only emits classes it finds in scanned files, so classes that arrive only through data (from the tools, at runtime) need the `@source inline(...)` safelist at the top of `src/index.css`. It is a copy of the tools' `globals.css` lines, which must match the tools' colour palette (`lib/types/colorPalette.ts`); change both repos together. Each directive stays on one line with `/* prettier-ignore */` above it.

## Gotchas

- Import specifiers are case-sensitive in the bundler even though macOS isn't.
- `*.old` and `*.zip` files are gitignored (`src/App.tsx.old`, `ragged.zip`); ignore them.
