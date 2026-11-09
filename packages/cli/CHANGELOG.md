# fiducy

## 0.3.0-beta.2

### Patch Changes

- [#100](https://github.com/fiducy-dev/fiducy/pull/100) [`3136738`](https://github.com/fiducy-dev/fiducy/commit/313673828eb5e5dd6ec0a096098235c683be9f03) Thanks [@Benonii](https://github.com/Benonii)! - `fiducy init` installs the @fiducy/* packages at the same version as the CLI, so a beta CLI no longer pulls the older stable SDK.

## 0.3.0-beta.1

### Patch Changes

- [#95](https://github.com/fiducy-dev/fiducy/pull/95) [`27491ce`](https://github.com/fiducy-dev/fiducy/commit/27491ce20333a7be9f98d4ebb06970deb70bc676) Thanks [@Benonii](https://github.com/Benonii)! - Color the CLI output in a terminal: created files in green, things to check in yellow, commands and paths in cyan, code to paste in blue. Plain text when piped or when NO_COLOR is set.

## 0.3.0-beta.0

### Minor Changes

- [#67](https://github.com/fiducy-dev/fiducy/pull/67) [`84dad6c`](https://github.com/fiducy-dev/fiducy/commit/84dad6cfe0c526d86cbed1f61a15a5b18dd918f0) Thanks [@Benonii](https://github.com/Benonii)! - New `fiducy` CLI: `fiducy init` adds Fiducy to an existing app with new files only, `fiducy dev` runs a local gateway whose keys survive restarts (with `--mock`, its widget says "Test gateway" and asks for a made-up key), and `fiducy generate` and `fiducy migrate` create the storage table. `sendWebResponse` now streams and keeps every cookie, and Drizzle and Prisma storage find their table on first use, so the CLI can load your server module before the table exists.

### Patch Changes

- [#76](https://github.com/fiducy-dev/fiducy/pull/76) [`b153a53`](https://github.com/fiducy-dev/fiducy/commit/b153a531df11640bda8698974a4ad621bab78a01) Thanks [@Benonii](https://github.com/Benonii)! - `fiducy dev` now listens on port 3438 (FIDU on a phone keypad) instead of 8787, so it no longer clashes with the repo prototype gateway. `fiducy init --framework farm` is now `--framework farmjs`, so it isn't confused with farm-fe.
