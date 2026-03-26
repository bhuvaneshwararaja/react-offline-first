# Changesets

We use [Changesets](https://github.com/changesets/changesets) to manage versions and `CHANGELOG.md`.

When your PR includes user-facing changes, run:

```bash
pnpm exec changeset
```

and commit the generated file under `.changeset/`.

Maintainers merge the “Version packages” PR created by CI (or run `pnpm run version-packages` locally) to bump versions and update the changelog before release.
