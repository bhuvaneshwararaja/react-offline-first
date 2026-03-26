# react-offline-first

**Repository:** [github.com/bhuvaneshwararaja/react-offline-first](https://github.com/bhuvaneshwararaja/react-offline-first)

React 18+ library for offline-capable UIs: **network status**, **cached queries**, a durable **mutation queue**, optional **conflict handling**, and **service worker** helpers. Runtime dependency: **React only** (peer).

## Quick start

```tsx
import {
  OfflineProvider,
  useOfflineQuery,
  useMutation,
  useNetworkStatus,
} from 'react-offline-first';

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

See `docs/tech-doc.md` for the full specification.

## Build

```bash
pnpm install
pnpm run build
pnpm test
```

Outputs: `dist/index.mjs` / `dist/index.cjs`, `dist/hooks/index.mjs`, `dist/adapters/index.mjs`, `dist/sw.js` (register helper), `dist/offline-first-sync-worker.js` (copy to your `public/` as `sw.js` if you use Background Sync).

## Subpath exports

- `react-offline-first`
- `react-offline-first/hooks`
- `react-offline-first/adapters`
- `react-offline-first/sw` — `registerServiceWorker`

## Open source

See [CONTRIBUTING.md](./CONTRIBUTING.md), [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md), and [SECURITY.md](./SECURITY.md). CI runs lint, tests (with Codecov upload), type-check, bundle size, example builds, and Storybook build (see `.github/workflows/ci.yml`). Releases use [Changesets](https://github.com/changesets/changesets) (`.github/workflows/release.yml`).

### Examples

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
