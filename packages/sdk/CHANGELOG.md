# @fiducy/sdk

## 0.3.0-beta.0

### Minor Changes

- [#64](https://github.com/fiducy-dev/fiducy/pull/64) [`398522d`](https://github.com/fiducy-dev/fiducy/commit/398522d15a07552518063a1381195053c5d7b6e6) Thanks [@Benonii](https://github.com/Benonii)! - Add Drizzle storage: `drizzleStorage(db, { table })` from `@fiducy/sdk/storage/drizzle`, and `generateSchema({ adapter: 'drizzle' })` for the table. Works with Drizzle 0.45 and 1.0 on Postgres, MySQL and SQLite.

- [#67](https://github.com/fiducy-dev/fiducy/pull/67) [`84dad6c`](https://github.com/fiducy-dev/fiducy/commit/84dad6cfe0c526d86cbed1f61a15a5b18dd918f0) Thanks [@Benonii](https://github.com/Benonii)! - New `fiducy` CLI: `fiducy init` adds Fiducy to an existing app with new files only, `fiducy dev` runs a local gateway whose keys survive restarts (with `--mock`, its widget says "Test gateway" and asks for a made-up key), and `fiducy generate` and `fiducy migrate` create the storage table. `sendWebResponse` now streams and keeps every cookie, and Drizzle and Prisma storage find their table on first use, so the CLI can load your server module before the table exists.

- [#63](https://github.com/fiducy-dev/fiducy/pull/63) [`23270c4`](https://github.com/fiducy-dev/fiducy/commit/23270c49f6b78b0f76319a898fc2e375490f0461) Thanks [@Benonii](https://github.com/Benonii)! - Add the `<fiducy-key provider="openai">` element (`@fiducy/sdk/element`) with thin wrappers for React (`FiducyKey` in `@fiducy/sdk/react`), Vue (`@fiducy/sdk/vue`), Svelte (`use:fiducyKey` from `@fiducy/sdk/svelte`) and Solid (`@fiducy/sdk/solid`). It reads its config from your key route, shows sign-in, connect, connected (with Replace and Remove) and error states, and fires `fiducy:connected`, `fiducy:removed` and `fiducy:error`. `fiducyToolkit()` no longer needs `gatewayURL` or `appID`.

- [#66](https://github.com/fiducy-dev/fiducy/pull/66) [`174f93d`](https://github.com/fiducy-dev/fiducy/commit/174f93de3c876d2ef6189a0acbaa5ff978ff5aaf) Thanks [@Benonii](https://github.com/Benonii)! - Framework helpers, modeled on Better Auth's: `toNextJsHandler` (`@fiducy/sdk/next`), `toTanStackHandlers` (`@fiducy/sdk/tanstack`), `toReactRouterHandlers` (`@fiducy/sdk/react-router`), `svelteKitHandler` for `hooks.server.ts` (`@fiducy/sdk/sveltekit`), `toNuxtHandler` (`@fiducy/sdk/nuxt`) and `toNodeHandler` / `toWebRequest` / `sendWebResponse` for Express, Fastify and NestJS (`@fiducy/sdk/node`). `createFiducy` also takes `env` for frameworks that keep `.env` out of `process.env`, such as SvelteKit 3.

- [#41](https://github.com/fiducy-dev/fiducy/pull/41) [`78993b5`](https://github.com/fiducy-dev/fiducy/commit/78993b53e2ce3da89cab80ac9790647408a67884) Thanks [@Benonii](https://github.com/Benonii)! - Add `fiducy.importKeys()` to move API keys an app already stores into Fiducy. It skips users who already have a key for that provider, so it is safe to run again. The low-level client gains `importKeys(apiKeys)`.

- [#65](https://github.com/fiducy-dev/fiducy/pull/65) [`4ff02ad`](https://github.com/fiducy-dev/fiducy/commit/4ff02ad241fbd94e3a1f06182b2f86677dd8f90f) Thanks [@Benonii](https://github.com/Benonii)! - Add Prisma storage: `prismaStorage(prisma, { provider })` from `@fiducy/sdk/storage/prisma`, and `generateSchema({ adapter: 'prisma' })` for the model. Works on Postgres, MySQL and SQLite with Prisma's driver adapters.

- [#62](https://github.com/fiducy-dev/fiducy/pull/62) [`7e367bb`](https://github.com/fiducy-dev/fiducy/commit/7e367bbb8c7ea71fcaa9f62d436d8fcf7e3daf20) Thanks [@Benonii](https://github.com/Benonii)! - Add SQL storage: `kyselyStorage` from `@fiducy/sdk/storage/kysely` keeps handles in Postgres, MySQL or SQLite using the connection the app already has (pg, mysql2, better-sqlite3, bun:sqlite, node:sqlite or Kysely). `getMigrations` creates the table, `generateSchema` from `@fiducy/sdk/storage` returns the SQL, and `fiducy.storage` exposes the storage so tools can generate and migrate.

- [#61](https://github.com/fiducy-dev/fiducy/pull/61) [`0386aca`](https://github.com/fiducy-dev/fiducy/commit/0386aca24899ad04a1a3df3d5135a25c8799aa02) Thanks [@Benonii](https://github.com/Benonii)! - Zero-setup server SDK. `createFiducy` reads `FIDUCY_GATEWAY_URL`, `FIDUCY_APP_ID` and `FIDUCY_APP_SECRET` from server env when the options are left out, refuses to run when the app secret sits in a public env var, and serves `GET {basePath}/config` so the browser needs no config of its own. `providerSettings(provider, { request } | { headers } | { userID })` now returns `{ ok: true, ...settings, fetch }` or `{ ok: false, reason: 'signed-out' | 'no-key' }` (breaking: it used to return `null`), with `respondToMissingKey()` for the 401/409 answer. The returned `fetch` drops a stored handle the gateway no longer has and turns gateway errors into readable provider-shaped errors. Key writes now take only `application/json` bodies up to 16 KB.

### Patch Changes

- Updated dependencies [[`b83c939`](https://github.com/fiducy-dev/fiducy/commit/b83c9394f4778c61985644c3dbe5df42ff949af5), [`0386aca`](https://github.com/fiducy-dev/fiducy/commit/0386aca24899ad04a1a3df3d5135a25c8799aa02)]:
  - @fiducy/widget@0.3.0-beta.0
  - @fiducy/core@0.3.0-beta.0

## 0.2.0

### Minor Changes

- [#49](https://github.com/Benonii/fiducy/pull/49) [`cadb608`](https://github.com/Benonii/fiducy/commit/cadb608900c74760cec3c617c81b327ce1d73640) Thanks [@Benonii](https://github.com/Benonii)! - `ConnectKeyWidget` no longer needs TanStack Query: it saves with plain `fetch` and works without a `QueryClientProvider`, which also fixes the "No QueryClient set" crash in `@fiducy/assistant-ui`'s key tool. `useFiducyKeys` and `fiducyKeysQueryKey` moved to the new `@fiducy/sdk/react-query` entry (breaking: update imports from `@fiducy/sdk/react`); the hook refreshes itself when the widget saves a key. New `saveConnectedKey()` and `FIDUCY_KEYS_CHANGED` exports for custom flows.

### Patch Changes

- Updated dependencies []:
  - @fiducy/core@0.2.0
  - @fiducy/widget@0.2.0
