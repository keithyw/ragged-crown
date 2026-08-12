# Ragged Crown

A turn-based, tile-based retro RPG engine inspired by classics like _Wizardry VI/VII_ and _Ultima V_, built with React, TypeScript, and Vite.

## 🛠 Tech Stack

- **UI & Rendering:** React 19, Tailwind CSS
- **Build System:** Vite
- **State Management:** Zustand
- **Language:** TypeScript
- **Tooling:** ESLint, Prettier

---

## 🏗 Engine Architecture

The game uses a decoupled, event-driven architecture to keep game rules testable and isolated from the React view layer.

- **Lifecycle / Template Engine (`src/engine/BaseGameEngine.ts`):** Uses the **Template Method** design pattern to enforce a unified game lifecycle (`initialize` → `loadAssets` → `setupState` → `startLoop`). Concrete engines (`OverworldEngine`, `CombatEngine`) inherit from this base class.
- **Command Bus (`src/engine/CommandBus.ts`):** Decouples player input handlers and UI controls from core game mechanics. Inputs dispatch lightweight typed commands (`MOVE_PLAYER`, `INTERACT`, etc.) that are handled by active engine subscribers.
- **Reactive View Layer:** React components read state from Zustand stores and render visual views based on engine ticks and state updates.

---

## 🚀 Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) installed (v18+ recommended) along with `pnpm`.

### Installation

```bash
# Clone the repository
git clone [https://github.com/your-username/ragged-crown.git](https://github.com/your-username/ragged-crown.git)
cd ragged-crown

# Install dependencies
pnpm install
```

## Development

```bash
# Start the development server
pnpm dev
```

```bash
# Run ESLint check
pnpm lint
```

```bash
# Format codebase with Prettier
pnpm format
```

## Building for Production

```bash
pnpm build
```

Open [ http://localhost:5173/](http://localhost:5173/) with your browser to see the result.
