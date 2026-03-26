# offline-first-react

[![npm version](https://img.shields.io/npm/v/offline-first-react.svg)](https://www.npmjs.com/package/offline-first-react)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/bhuvaneshwararaja/react-offline-first/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

Offline-first React 18+ primitives: **network status**, **cached queries**, a durable **mutation queue**, optional **conflict handling**, and **service worker** helpers. **Peer dependency: React only** (no other runtime deps).

## Install

```bash
npm install offline-first-react
```

```bash
pnpm add offline-first-react
yarn add offline-first-react
```

**Peer:** `react` >= 18.0.0

### Package name vs repository

|                     |                                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------------- |
| **npm package**     | [`offline-first-react`](https://www.npmjs.com/package/offline-first-react)                          |
| **Source & issues** | [`bhuvaneshwararaja/react-offline-first`](https://github.com/bhuvaneshwararaja/react-offline-first) |

The name `react-offline-first` is already used on npm by another project, so this library is published under **`offline-first-react`**. Import from `offline-first-react` in application code.

## Usage

```tsx
import {
  OfflineProvider,
  useOfflineQuery,
  useMutation,
  useNetworkStatus,
} from 'offline-first-react';

function App() {
  return (
    <OfflineProvider
      config={{
        storeName: 'my-app',
        maxRetries: 3,
        conflictStrategy: 'client-wins',
      }}
    >
      <Main />
    </OfflineProvider>
  );
}
```

## Entry points (subpath exports)

| Import                         | Purpose                                                    |
| ------------------------------ | ---------------------------------------------------------- |
| `offline-first-react`          | Provider, hooks, adapters, `registerServiceWorker`, types  |
| `offline-first-react/hooks`    | Tree-shakeable hook re-exports                             |
| `offline-first-react/adapters` | `MemoryAdapter`, `IndexedDBAdapter`, `LocalStorageAdapter` |
| `offline-first-react/sw`       | `registerServiceWorker` helper                             |

## Service worker

Optional Background Sync: ship `dist/offline-first-sync-worker.js` from the package build as your public `sw.js` (or merge into your own worker). See the [technical specification](https://github.com/bhuvaneshwararaja/react-offline-first/blob/main/docs/tech-doc.md#8-service-worker-bridge) in the repo.

## Documentation

- **Full spec:** [docs/tech-doc.md](https://github.com/bhuvaneshwararaja/react-offline-first/blob/main/docs/tech-doc.md) (in the GitHub repository)

## Contributing

[Contributing](https://github.com/bhuvaneshwararaja/react-offline-first/blob/main/CONTRIBUTING.md) · [Code of Conduct](https://github.com/bhuvaneshwararaja/react-offline-first/blob/main/CODE_OF_CONDUCT.md) · [Security](https://github.com/bhuvaneshwararaja/react-offline-first/blob/main/SECURITY.md)

CI (lint, tests, Codecov, type-check, bundle size, examples, Storybook) runs in [ci.yml](https://github.com/bhuvaneshwararaja/react-offline-first/blob/main/.github/workflows/ci.yml). Releases use [Changesets](https://github.com/changesets/changesets) via [release.yml](https://github.com/bhuvaneshwararaja/react-offline-first/blob/main/.github/workflows/release.yml).

### Clone and build

```bash
git clone https://github.com/bhuvaneshwararaja/react-offline-first.git
cd react-offline-first
pnpm install
pnpm run build
pnpm test
```

Build outputs: `dist/index.mjs` / `dist/index.cjs`, `dist/hooks/index.mjs`, `dist/adapters/index.mjs`, `dist/sw.js`, `dist/offline-first-sync-worker.js`.

### Examples (monorepo)

```bash
pnpm install
pnpm run build
pnpm --filter @example/todo-app dev
pnpm --filter @example/notes-sync dev
```

### Storybook

```bash
pnpm run storybook
```

## License

[MIT](https://github.com/bhuvaneshwararaja/react-offline-first/blob/main/LICENSE)
