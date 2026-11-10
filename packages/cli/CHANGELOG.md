# fiducy

## 0.3.0-beta.5

### Patch Changes

- [#109](https://github.com/fiducy-dev/fiducy/pull/109) [`6651043`](https://github.com/fiducy-dev/fiducy/commit/6651043adf3a3c1fab03fbc061fad1d6485ab7e6) Thanks [@Benonii](https://github.com/Benonii)! - `fiducy dev` now keeps your env files in step with the dev gateway. It adds missing `FIDUCY_*` lines to an existing `.env`, and it replaces stale dev values (`app_dev_…`, `fsk_dev_…`, a localhost gateway URL) after you reset `.fiducy/`. Values from a real gateway are left alone. `@fiducy/assistant-ui/server` adds `streamWithKeyRequests`: when a saved key turns out to be gone mid-chat, the thread shows the key box instead of an error.

- [#114](https://github.com/fiducy-dev/fiducy/pull/114) [`dddb144`](https://github.com/fiducy-dev/fiducy/commit/dddb14413cca65113edfd0eec1ba22052e0604fb) Thanks [@Benonii](https://github.com/Benonii)! - `fiducy init` writes code for the AI provider your app already uses (`@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google` for Gemini, or `@openrouter/ai-sdk-provider`) instead of always OpenAI: the model call, the key box provider and the assistant-ui key request all follow it, and the agent prompt names every provider it found. `fiducy dev --mock` now also answers Gemini and OpenRouter calls.

- [#111](https://github.com/fiducy-dev/fiducy/pull/111) [`25889e5`](https://github.com/fiducy-dev/fiducy/commit/25889e5ba43a6f69bbc36e4e0a0df827d6d8d2d3) Thanks [@Benonii](https://github.com/Benonii)! - Refuse a public app secret before anything runs. `createFiducy` now throws as soon as it is called when `FIDUCY_APP_SECRET` sits in a public env var (`NEXT_PUBLIC_`, `VITE_`, `PUBLIC_`, `NUXT_PUBLIC_`, `EXPO_PUBLIC_`, `REACT_APP_`), instead of waiting for the first request, and `fiducy dev` refuses to start while one of those names is in your env files.

- [#112](https://github.com/fiducy-dev/fiducy/pull/112) [`c2a3f19`](https://github.com/fiducy-dev/fiducy/commit/c2a3f19e47cea750d39044f2d140750a40301701) Thanks [@Benonii](https://github.com/Benonii)! - `fiducy generate` works again after you delete `fiducy-schema.ts`. Your app imports that file, so loading it failed with "Cannot find module './fiducy-schema'"; generate now falls back to the dialect in drizzle.config and rewrites the table. When your schema file already exports it, the hint says so instead of asking you to add it.

## 0.3.0-beta.4

### Minor Changes

- [#105](https://github.com/fiducy-dev/fiducy/pull/105) [`c1a690c`](https://github.com/fiducy-dev/fiducy/commit/c1a690c908add0b808badeb8575aedd78935ce81) Thanks [@Benonii](https://github.com/Benonii)! - `fiducy init` asks where users add their key: in the chat, on the settings page, or on a page you name (`--widget chat|settings|/route`). It detects assistant-ui and AI SDK `useChat` to default to the chat, falls back to settings when there is no chat UI, and tells your coding agent never to put the key box in a header or layout. The model snippet now uses `createOpenAI(settings).responses(...)`, since OpenAI's current reasoning models refuse tool calls with reasoning on Chat Completions.

### Patch Changes

- [#106](https://github.com/fiducy-dev/fiducy/pull/106) [`45b2d62`](https://github.com/fiducy-dev/fiducy/commit/45b2d62da80f696149b3db51c7877156e3d2cf69) Thanks [@Benonii](https://github.com/Benonii)! - The setup prompt from `fiducy init` and `fiducy prompt` covers what an agent previously had to work out alone. Commands use your package manager and the pinned CLI version. Drizzle apps get `drizzle-kit push`, or `generate` + `migrate` when they keep migrations, plus the schema export line. The prompt explains that `fiducy dev` keeps running and writes `.env`, tells the agent to keep the app's model and request variable, mentions the now unused provider key, and ends with a done check.

## 0.3.0-beta.3

### Patch Changes

- [#102](https://github.com/fiducy-dev/fiducy/pull/102) [`a876fb2`](https://github.com/fiducy-dev/fiducy/commit/a876fb2b8305050b13cdc078cbb8361c07f0b3ea) Thanks [@Benonii](https://github.com/Benonii)! - `fiducy init` output is shorter: a spinner while packages install, a checklist of what it did, numbered steps for what is left, and the next commands. `--show-code` prints the code for each step. In a terminal it copies a setup prompt for your coding agent to the clipboard, and the new `fiducy prompt` command prints that prompt.

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
