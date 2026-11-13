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
- **The tools author the content.** `ragged-crown-tools` (Go API + MongoDB + Next.js) is where tiles, objects, items, zones and sprites are made. How the game will receive that content is decided but not built ([Game 8]): a two-method content source (`getAll`, `get`) backed by the tools API in development (the real API on the normal dev port, the sandbox API on a second "sandbox" dev port) and by exported files of the same shape, committed in this repo, in a published build. Phase 1 is built ([Game 1]): the game reads defs and zones from the API (`ContentSource`, `useContentStore`, `ZoneLoaderService`); dialogs and monsters are still static JSON, and the export phase isn't built.
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
- World movement: arrows or WASD call `movePlayer(dx, dy)`; `E` calls `enterPortal()`. The handler also checks that the screen is `WORLD_MAP` before acting.

---

## 5. World movement and interactions

The game follows the tools' model (DATA-MODEL sections 1, 3, 4 and 5). Section 5.1 describes what runs; 5.2 lists what is left. The old `tileEvents` / `ActionPayload` / command pipeline was removed in [Game 2].

### 5.1 How it works

**Content.** `useContentStore` holds the defs (`tiles`, `items`, `entities`, `sprites`) as `Map<_id, def>`, loaded through `ContentSource` (section 1). A zone comes from `ZoneLoaderService`, by `_id` (portals) or by its user-facing `id` (the starting zone, via the region bridge in `GameEngine`).

**Runtime state** (`useGameStore`). `currentZone` is the loaded zone and is never changed. `runtimePlacements` is a `structuredClone` of its `placements`, the copy that spawns and removals change. `zoneRuntimes` keeps the copy of each zone left behind, so changes last the session. `flags` and `interactionRuns` (per placement `uid` and interaction `id`) are runtime only. None of this is in the save, and `resetRuntime()` clears it on Start New Game.

**Movement** (`GameEngine.movePlayer`):

1. `InteractionEngine.evaluateMove` checks bounds, the terrain def (blocked unless `isWalkable`) and the cell's stack (blocked if any placement is a solid object).
2. If blocked, `trigger('BUMP_INTERACT', ...)` runs the top placement's interaction. If it had none, the block reason goes to the log.
3. If allowed, the player moves, then `trigger('WALK', ...)` runs. Stepping onto a portal logs "Press E to enter".
4. `EncounterService.shouldTriggerEncounter` rolls `encounterRate × dangerLevel` (never in `dangerLevel: 0` zones) and, on a hit, starts combat (section 6).

**`E` enters a portal** (`GameEngine.enterPortal`): the top-most portal placement under the player. It loads `destination.zoneId` and places the player at `destination.pos`, else the zone's `startingPosition`. A portal with no destination is unconnected.

**Interactions** (`InteractionEngine.trigger`, with the pure parts in `utils/interactions.ts`):

- Gather the top placement's interactions for the trigger, then its def's. Skip the ones used up (`limit`). The first whose conditions all pass runs; a run is counted only if the interaction has a `limit`. When none passes, one failing interaction shows its `hint`, several show the def's description, otherwise "Nothing happens.".
- The engine reads and changes the game only through an `InteractionHost` (log, flags, run counts, placements, party), which `GameEngine` builds from the stores.
- **Implemented:** conditions `FLAG_SET`, `FLAG_NOT_SET`; actions `SHOW_DIALOG` (static and custom, to the event log), `SET_FLAG`, `MODIFY_ATTRIBUTE` (stats, hp/sp current and max; xp and level are skipped), `SPAWN`, `REMOVE_SELF`. Everything else warns and is skipped. A condition that can't be evaluated fails, so the fallback runs.
- **Triggers wired:** `BUMP_INTERACT` and `WALK`. `TALK`, `OPEN`, `USE`, `PICKUP`, `DROP` and `CLOSE` have no key or command yet.

Decisions made while building this are recorded on [Game 5].

### 5.2 What is left

- **Items.** `GIVE_ITEM`, `TAKE_ITEM` and `HAS_ITEM` wait for an inventory, which is out of scope for now. A `HAS_ITEM` condition fails, so those interactions show their hint.
- `GIVE_CURRENCY`, `TELEPORT` and `PLAY_SOUND` ([Game 2]); `TELEPORT` could reuse `enterPortal`'s travel.
- Blocking the player when a portal's conditions fail (undesigned in DATA-MODEL), edge exits ([Game 7]).
- Persisting the runtime state in the save, once the shape is decided (`SaveGameDocument.worldState.flags` exists but holds only the new-game flags).
- Dialog is only a line in the event log; there is no dialog box in the world view ([Game 11]).

Saving happens on character creation and deletion, on Start New Game, and at the end of a cut scene. There is no Load Game yet, and the player's position and party HP are not written back during play.

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

**Interactions (section 5)**

1-4. _Resolved ([Game 2])._ The old `tileEvents` pipeline (the `"y,x"` key order, the re-queue loop that mutated the zone, ignored `triggerOn`, the `console.log` command stubs) was removed and replaced by `InteractionEngine.trigger`.

**Movement and world**

5. `evaluateMove` blocks when `isWalkable` is absent (`!targetTile.isWalkable`); the tools treat it as optional. (The old `utils/movement.ts` copy that used `=== false` is gone.)
6. `startNewGame` hard-codes `'starter_town'` and `{ x: 3, y: 3 }` instead of using the zone's `startingPosition`, and doesn't set `playerPosition` from the save.
7. Leaving a zone's edge is always blocked; edge exits (DATA-MODEL 2.2) don't exist yet. Portals work ([Game 7]): stand on one and press `E`; `GameEngine.enterPortal` loads the destination zone by `_id` and puts the player at the destination's `pos` or the zone's `startingPosition`.

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
19. Probably dead: `PartyService`, `constants/styles2.ts`. _(`utils/movement.ts`, `constants/tiles.ts` and the `spriteCoords` path in `MapSquare` were removed in [Game 1].)_
