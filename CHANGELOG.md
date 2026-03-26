# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Release notes after 0.1.0 are generated via [Changesets](https://github.com/changesets/changesets) when publishing.

## [0.1.0] - 2025-03-26

### Added

- Initial `offline-first-react` implementation (registry name `react-offline-first` was already taken): `OfflineProvider`, `useNetworkStatus`, `useOfflineQuery`, `useMutation`, `useQueue`, `useConflict`
- Storage adapters: `MemoryAdapter`, `IndexedDBAdapter`, `LocalStorageAdapter`
- Service worker registration helper (`offline-first-react/sw`) and minimal Background Sync worker script
- Vitest unit and integration tests, Rollup dual build, TypeScript declarations

[0.1.0]: https://github.com/bhuvaneshwararaja/react-offline-first/releases/tag/v0.1.0
