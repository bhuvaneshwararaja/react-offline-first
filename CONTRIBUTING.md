# Contributing

Thank you for helping improve **react-offline-first**. This document describes how we work together.

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 9+

## Getting started

```bash
pnpm install
pnpm run build
pnpm test
```

## Pull request guidelines

1. **Open an issue first** for significant changes (new APIs, behavior changes) so we can align on design.
2. **Keep PRs focused** — one logical change per pull request.
3. **Update tests** when you change behavior; add tests for new logic in `tests/unit` or `tests/integration` as appropriate.
4. **Run checks locally** before pushing:

   ```bash
   pnpm run lint
   pnpm run type-check
   pnpm test
   pnpm run build
   pnpm run size
   ```

5. **Document public API** — new exports should include TSDoc (`/** ... */`) on types and functions consumers rely on.
6. **Changelog** — for user-facing changes, add a [Changeset](https://github.com/changesets/changesets) after your change is ready:

   ```bash
   pnpm exec changeset
   ```

   Choose the appropriate semver bump (patch / minor / major) and write a concise summary for `CHANGELOG.md`.

## Code style

- TypeScript strict mode; prefer explicit types on public APIs.
- Formatting and ESLint rules are enforced in CI (`prettier`, `eslint`).

## Community standards

All participants must follow the [Code of Conduct](./CODE_OF_CONDUCT.md).

## Security

Please report security issues privately as described in [SECURITY.md](./SECURITY.md), not via public issues.
