# Architecture

How the Ragged Crown game fits together **as the code stands today** (2026-11-11), so changes can be made against an accurate picture. Where the code and the intended design disagree, the intent lives in the tools repo's `DATA-MODEL.md` (`../ragged-crown-tools/DATA-MODEL.md`) and on the Trello "Game" list; this doc points at them rather than repeating them. Problems found while writing it are in **Known gaps** (section 9).

---

## 1. Big picture

```
┌─────────────────────────────┐   fetch (static JSON)   ┌──────────────────┐
│ Browser: Vite + React 19    │ ◄────────────────────── │ public/data/*.json│
│  engines (plain TS classes) │                         └──────────────────┘
│  Zustand stores             │   read/write            ┌──────────────────┐
│  React screens (views)      │ ◄─────────────────────► │ localStorage     │
└─────────────────────────────┘                         │ characters, saves│
                                                        └──────────────────┘
```

- **No backend.** Content is static JSON served from `public/data/`. Player data (created characters, saved games) is in localStorage, which avoids sessions and authentication.
- **The tools author the content.** `ragged-crown-tools` (Go API + MongoDB + Next.js) is where tiles, objects, items, zones and sprites are made. How the game will receive that content is decided but not built ([Game 8]): a two-method content source (`getAll`, `get`) backed by the tools API in development (the real API on the normal dev port, the sandbox API on a second "sandbox" dev port) and by exported files of the same shape, committed in this repo, in a published build. Today the game still reads hand-written JSON in the old model.
- **Engines own the rules, React owns the view.** Engines are plain TypeScript singletons that read and write Zustand stores with `getState()` / `setState()`. Components subscribe to the stores and render; some also bind keys and call the engines (section 4).

---

## 2. Lifecycle and the game loop

`BaseGameEngine` (`src/engine/BaseGameEngine.ts`) is a template method:

```
initialize()  →  loadAssets()  →  setupState()  →  registerCommandHandlers()  →  onInitialized()  →  startLoop()
```

`startLoop()` runs a `requestAnimationFrame` loop that calls `update(deltaTime)`. **Nothing game-relevant happens in it:** `GameEngine.update` only adds to a private `gameTime` counter. The game is turn based and **driven by key presses**, not by ticks: every state change starts in a key handler (section 4).

`GameEngine` (`src/engine/GameEngine.ts`, singleton via `getGameEngine()`) is the only concrete subclass. `App.tsx` calls `initialize()` in a `useEffect` and `shutdown()` in its cleanup.

| Step | What `GameEngine` does |
| --- | --- |
| `initialize` | Attaches the `InputManager` window listener, then runs the template. Guarded by `isInitialized`. |
| `loadAssets` | In parallel: the `starter_town` zone, `monster.json`, `tile_objects.json`; plus created characters from localStorage. Writes them to `useGameStore` / `useCharacterCreationStore`. |
| `setupState` | Sets `playerPosition` from the zone's `startingPosition` (or `DEFAULT_STARTING_POSITION`). |
| `registerCommandHandlers` | Empty. |
| `onInitialized` | `startGame()`: sets the screen to `INTRO`. |

`CombatEngine` and `InteractionEngine` do **not** extend `BaseGameEngine`; they are plain singletons (`combatEngine`, `getInteractionEngine()`), as is `CharacterEngine` (saves and deletes created characters).

---

## 3. Screens and modes

`useGameStore.currentScreen` (`GameScreen` in `src/types/game.ts`) decides what `App.tsx` renders, one component per screen in `src/components/layout/`:

```
INTRO ──► MAIN_MENU ──┬─► CHARACTER_CREATION ──► (save) ──► MAIN_MENU
 (Splash)             ├─► PARTY_ROSTER ◄──► CHARACTER_SHEET
                      └─► "Start New Game" ──► CUT_SCENE ──► WORLD_MAP
                                                               │  ▲
                                                 encounter     ▼  │ win / flee
                                                         (combat, same screen)
```

- **`WORLD_MAP`** renders `GameLayout` with the overhead map, the encounter viewport, the event log and the party panel. **Combat does not change the screen:** it runs inside the encounter viewport on `WORLD_MAP`. `COMBAT`, `COMBAT_PLANNING` and `SETTINGS` exist in the type but nothing sets them.
- **Start New Game** (`GameEngine.startNewGame`): builds a `SaveGameDocument` (party ids, the character pool, `currentZoneId: 'starter_town'`, flags `is_new_game` and `intro_complete`), saves it, then `triggerCutScene('starter_town', 'intro')`.
- **Cut scenes** (`triggerCutScene`, `CutSceneScreen`): `loadRegion` loads the zone and `public/data/dialogs/<region>.json` into `useDialogStore`; the sequence's frames are stepped with Enter/Space. A frame can carry a typed `quiz`. At the end, the sequence's `onCompleteFlag` is written into the save's `worldState.flags` (store and localStorage), then `enterWorldMode()`.
- **Character creation** is a step wizard (name, gender, attributes) over `useCharacterCreationStore.draft`. Characters start at level 0, race defaults to human, no class (CLAUDE.md, "Game design").

---

## 4. Input

`InputManager` (`src/engine/InputManager.ts`, singleton `inputManager`) owns one `keydown` listener on `window` and a set of handlers.

- `registerHandler(fn)` adds a handler and returns its unbind function.
- On a key, handlers run **newest first**; the first that returns `true` stops the key there. Key repeat is ignored.
- There is no explicit mode object. **A mode is whichever handlers are currently registered.** Two places register them:
  - **Screens**, in a `useEffect` (splash, main menu, roster, character sheet, creation steps, cut scene). They unbind on unmount or when their dependencies change.
  - **Engines**, which keep the unbind function in a field and swap handlers as the mode changes: `GameEngine.unbindWorldInput` (movement on `WORLD_MAP`) and `CombatEngine.unbindInput` (one handler per combat phase).
- World movement: arrows or WASD call `movePlayer(dx, dy)`. The handler also checks that the screen is `WORLD_MAP` before acting.

---

## 5. World movement and interactions

This is the area furthest from the tools' model and the one most in need of rework. Section 5.1 is what runs today; 5.2 is what it has to become; 5.3 lists what the port touches.

### 5.1 Today: `tileEvents` and `ActionPayload`

**Data.** A zone (`Zone` in `src/types/map.ts`) is `terrain: string[][]` of tile keys (`T001`) plus an optional `tileEvents: Record<string, ActionPayload[]>`, keyed by cell. Tile defs are a flat map in `tile_objects.json` (`T001` grass, `T002` dirt, `C001` a non-walkable "Humanoid"); an NPC is a terrain tile. An `ActionPayload` is one flat bag of optional fields (`text`, `dialogKey`, `itemId`, `amount`, `targetZone`, `spawnTileId`, ...) plus `type`, `triggerOn` and `popOnComplete`.

**Flow.** `GameEngine.movePlayer`:

1. `InteractionEngine.evaluateMove` checks bounds, finds the terrain def and blocks if `isWalkable` isn't true.
2. If the move is blocked **and** the target cell has events, `evaluateTile` runs them (a "bump") and the player stays put.
3. If blocked with no events, the block reason goes to the log.
4. If allowed, the cell's events run (if any) and the player moves.
5. After a move, `EncounterService.shouldTriggerEncounter` rolls `encounterRate × dangerLevel` (never in `dangerLevel: 0` zones) and, on a hit, starts combat (section 6).

`evaluateTile` → `handleEvents` loops over the cell's `ActionPayload[]`, turns each into a command with `CommandFactory`, and executes it with a shared `PipelineContext` (`src/types/commands.ts`). A command returns a `CommandResult`; `data` is passed to the next command through `ctx.result`, and `success: false` or `stopPipeline` ends the chain.

**Commands** (`src/engine/commands/`): `GIVE_ITEM`, `SHOW_DIALOG` and `POP_STACK` only. All three are stubs: they `console.log` (the player sees nothing in the game) or set a context flag nobody reads. `SHOW_DIALOG` can substitute `{item}` from a preceding `GIVE_ITEM`'s result. Every other `ActionType` warns and is skipped.

**Why it's rotten** (details in Known gaps):

- `triggerOn` is ignored: every event on a cell runs on any bump or step.
- `popOnComplete: false` pushes the action back onto the array being looped over, which is the **zone's own loaded data**. With a command that always succeeds, that loop never ends; and it mutates cached zone data, which DATA-MODEL section 5 forbids.
- The event lookup uses the key `"y,x"`, the map parser `"x,y"`.
- There is no notion of conditions, precedence, limits, runtime state, or a stack of things on a cell.

### 5.2 Target: definitions, placements, interactions

The tools have replaced this design (DATA-MODEL sections 1, 3, 4 and 5). In short:

- **Defs** with a `kind` (`terrain`, `object`, `item`, `portal`, `creature`) and a nested `glyph` (plus an optional `spriteId`), resolved by Mongo `_id`, not `T001`.
- A zone's `terrain` holds terrain `_id`s; things on top live in **`placements: Record<"x,y", Placement[]>`**, a stack ordered bottom to top. Only the **top** placement is interacted with and drawn. A cell is blocked if its terrain isn't walkable or any placement in the stack is solid.
- **`Interaction`** = `{ id, on, conditions?, hint?, actions, limit? }`, on the def and (per instance) on the placement. `Action` and `Condition` are discriminated unions on `type`, each carrying only its own fields.
- **Precedence:** gather the placement's interactions, then the def's; the first whose conditions all pass runs, the rest are skipped.
- **Limits:** counted per (placement `uid`, interaction `id`) in runtime/save state; the count drops only when the interaction runs. The engine never re-queues actions (`popOnComplete` is gone). Only `REMOVE_SELF` removes a thing.
- **Authored vs runtime:** zone JSON is the initial state; spawns, removals, counts and remaining uses live in a runtime copy and the save. Zone data is never mutated.
- **Custom values:** a def's action or condition can be a slot that each placement fills in (`customValues`).

The game-side work is already broken into cards: **[Game 1]** (copy the types, resolve by `_id`, load `terrain` + `placements` into runtime state, render the top of the stack, blocking), **[Game 2]** (the interaction engine: precedence, conditions, limits, and the action types in a fixed order, starting with `SHOW_DIALOG`, then `SET_FLAG` and flag conditions), **[Game 5]** (engine decisions the tools leave open, including what `HAS_ITEM` evaluates to while inventory doesn't exist), [Game 6] (sprites) and [Game 7] (portals).

### 5.3 What the port touches

| Today | Becomes |
| --- | --- |
| `src/types/map.ts` (one file, old `TileDef`, `ActionPayload`, the `TileType*` unions) | The tools' `core.ts`, `defs.ts`, `interactions.ts`, `map.ts` (listed in their `shared.ts`), imported through the `@shared/types` alias ([Game 10]), not copied |
| `tile_objects.json` keyed `T001`; `TileTypeLoaderService` | Defs from the tools, keyed by `_id`, per collection |
| `zone.tileEvents` | `zone.placements` plus a runtime copy |
| `InteractionEngine.getTileEvents / hasTileEvents / evaluateTile / handleEvents` | Resolve the top placement, pick one interaction (a pure function, per [Game 2]), run its actions |
| `CommandFactory` + `ActionPayload` switch | A switch on the `Action` union; unimplemented types warn and skip |
| `PipelineContext.flags.popTopTile` / `POP_STACK` | `REMOVE_SELF` on the runtime copy |
| `utils/mapParser.ts` (`ResolvedCell.events`), `MapSquare` (flat `symbol`/`color`) | Terrain plus the top placement's glyph or sprite |
| `GameEngine.movePlayer` (bump vs step) | Bump on a solid top placement (no movement), `WALK` on entering a space; the trigger types decide which interactions are eligible |
| `SaveGameDocument.worldState.flags` | Also holds the runtime deltas (limit counts, removals, spawns), shape undecided |

**Open, to settle before or during [Game 1]:** the content delivery decision; whether the command-object pipeline (`Command`, `CommandResult.data` passed between actions) is kept for the new action types or replaced by a plain switch (the `{item}` substitution is its only use of piping today); where the runtime copy of placements lives (a store, or the engine).

---

## 6. Combat engine

`CombatEngine` (`src/engine/CombatEngine.ts`, singleton `combatEngine`, ~480 lines) is a Wizardry-style round: each party member queues an action, then the round runs all at once. State lives in `useGameStore` (`encounter`, `combatPhase`, `subPhase`, `activeCharacter`, `actionQueue`, `selectedTargetIndex`); the engine swaps one key handler per phase.

**Starting.** `GameEngine.movePlayer` builds an encounter with `generateEncounter(zone, tile)`, unbinds world input, stores it, and calls `enterCombat(onExit)` with a callback back to `enterWorldMode()`.

**Encounter generation.** Monster templates come from `monster.json` (four, hard-coded). A tile whose name contains "road" gives 1-3 bandits, anything else 1-4 goblins, both in melee range; 30% of the time 1-2 giant spiders are added as a second, out-of-range group. HP is the template's `maxHp`. `zone.dangerLevel` is copied in but not used to choose monsters.

**Phases** (`CombatPhase`) and their keys:

| Phase | Keys | Next |
| --- | --- | --- |
| `INIT` | `F` fight, `R` run | `PLANNING`, or flee back to the world |
| `PLANNING` / `ACTION_SELECT` | `A` attack, `D` defend, `C` cast (classes `Mage`, `Cleric`, `Paladin` only, so never today), Backspace resets | Attack with one group commits at once; with several, `TARGET_SELECT` |
| `PLANNING` / `TARGET_SELECT` | Up/Down cycle living groups, Enter commits, Escape cancels | Next character, or `CONFIRMATION` after the last |
| `CONFIRMATION` | Enter runs the round, Backspace resets planning | `EXECUTING` |
| `EXECUTING` | none (synchronous) | `PLANNING` again, or `POST_COMBAT` |
| `POST_COMBAT` | Enter/Space | back to the world (`finishCombat`) |

The encounter viewport also has buttons that call `flee()`, `enterCombat()` and `handleActionSelectInput()` directly.

**A round** (`executeRound`):

1. Party actions in queue order. A downed actor is skipped. `ATTACK` hits the first living monster of the target group for 3-8; `DEFEND` and `CAST_SPELL` only log.
2. Every living monster hits a random living party member for 1-4.
3. `evaluateCombatOutcome`: all monsters dead → `POST_COMBAT`; whole party down → logs "Game Over" (and nothing else); otherwise back to planning.

No attributes, levels, defence or initiative affect any of it; damage is flat random. No XP, loot or currency is given.

---

## 7. State

Three Zustand stores in `src/store/`, all written directly by engines and components:

| Store | Holds |
| --- | --- |
| `useGameStore` | Current screen; zone, tile defs, monster templates; player position; party; save game; combat state; the event log (the last 10 lines); the character being inspected |
| `useCharacterCreationStore` | Created characters (mirrors localStorage) and the creation wizard's draft and step |
| `useDialogStore` | The loaded region's dialog sequences, the active sequence and frame |

The party in `useGameStore` holds full `PlayerCharacter` copies (combat damage is written there); the save holds `activePartyMemberIds` plus a copy of the character pool.

---

## 8. Content loading and persistence

**Loaders** (`src/services/`), all `fetch` from `public/data/`:

| Service | File | Notes |
| --- | --- | --- |
| `mapLoaderService.loadZone(id)` | `maps/<id lowercased>.json` | Caches per id. Fills `dimensions` from the terrain if missing. No validation. |
| `tileTypeLoaderService.load()` | `tile_objects.json` | A `Record<string, TileDef>` keyed `T001` etc. |
| `dialogService.getDialogByRegionId(id)` | `dialogs/<id>.json` | Cut-scene sequences keyed by name (`intro`). |
| `EncounterService.fetchMonsters()` | `monster.json` | Also holds the encounter roll. |
| `PartyService.fetchParty()` | `party.json` | Not called anywhere. |

`maps/a1.json` is the old prototype map and is deliberately unreferenced.

**Persistence** (localStorage, JSON):

| Key | Service | Holds |
| --- | --- | --- |
| `crpg_created_characters_v1` | `CharacterStorageService` | `PlayerCharacter[]`, the character pool |
| `crpg_saved_games_v1` | `SaveGameService` | `SaveGameDocument[]`: metadata, `worldState` (zone id, position, flags), active party ids, the character pool |

Saving happens on character creation and deletion, on Start New Game, and at the end of a cut scene. There is no Load Game yet, and the player's position and party HP are not written back during play.

---

## 9. Known gaps

Found while writing this doc, by reading the code. **Not fixed.** Items marked _(unverified)_ come from reading only and need the game running to confirm.

**Interactions (section 5; replaced wholesale by [Game 1] / [Game 2])**

1. **Cell key order.** `InteractionEngine.getTileEvents` reads `zone.tileEvents[y + ',' + x]`; `parseZoneGrid` reads `` `${x},${y}` ``. Hidden today because the only event is at `"1,1"`.
2. **Re-queue loop and zone mutation.** `handleEvents` pushes every action without `popOnComplete` back onto the array it is iterating, which is the cached zone's own array. A chain of always-succeeding commands never ends, and the zone data changes.
3. `triggerOn` is never checked; `PipelineContext.flags` (`popTopTile`, `zoneTransition`) is set or declared but never read.
4. Commands are `console.log` stubs; the player never sees a `SHOW_DIALOG`.

**Movement and world**

5. `evaluateMove` blocks when `isWalkable` is absent (`!targetTile.isWalkable`); the tools treat it as optional. The unused `utils/movement.ts` copy used `=== false`.
6. `startNewGame` hard-codes `'starter_town'` and `{ x: 3, y: 3 }` instead of using the zone's `startingPosition`, and doesn't set `playerPosition` from the save.
7. Leaving a zone's edge is always blocked; edge exits (DATA-MODEL 2.2) and portals don't exist yet ([Game 7]).

**Combat**

8. **Stale store snapshot.** `bindPlanningInputs` captures `useGameStore.getState()` once, then reads `store.subPhase` inside the handler. Zustand replaces the state object on every `set`, so the handler sees the sub-phase from when it was bound. It mostly works because target selection rebinds its own handler. _(unverified in play)_
9. Two target-selection paths: `bindTargetSelectInput` (arrow keys, the one actually bound) and `handleTargetSelectInput` (number keys 1-n, reachable only through that stale sub-phase). The log still says "Select Target Group [1-n]".
10. **Party wipe leaves the game stuck.** On "Game Over" the confirmation handler stays bound, so Enter runs another round. There is no game-over screen.
11. Downed characters are still asked for actions in planning; only execution skips them.
12. `resolvePartyAttack` changes monster HP in place and then sets a shallow copy of the encounter.
13. `generateEncounter` assumes `bandit`, `goblin` and `giant_spider` exist (`as Monster`); a missing template crashes.
14. The encounter viewport's Fight button calls `enterCombat()` without the exit callback, so it reuses whatever callback was stored last.

**Lifecycle, screens, data**

15. **React StrictMode double effect.** In dev, `App`'s effect runs initialize → shutdown → initialize. `isInitialized` is only set after the async `loadAssets` finishes, so the second call isn't stopped by it, and `shutdown` detaches the input listener and stops the loop during the first. Whether this ends with zero, one or two key listeners and loops needs checking in the browser. _(unverified)_
16. Main menu options 1 and 2 have a `screen`, so `handleExecuteOption` calls `setScreen` and never runs their `action` (`enterCharacterCreationMode` / `enterPartyRosterMode`). Harmless today (those only unbind world input), but the action is dead.
17. The party cap of 4 is a literal in `PartyRosterScreen`; `addCharacterToParty` doesn't check it ([Game: Debt 1]).
18. _Resolved._ The Tailwind safelist for glyph colours from data is in `src/index.css`, copied from the tools' `globals.css`.
19. Probably dead: `utils/movement.ts` and `TILE_REGISTRY` / `TILE_KEY_MAP` in `constants/tiles.ts`, `PartyService`, `constants/styles2.ts`, the `useSprites` / `spriteCoords` path in `MapSquare`.
