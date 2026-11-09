# @fiducy/assistant-ui

## 0.3.0-beta.4

### Patch Changes

- [#105](https://github.com/fiducy-dev/fiducy/pull/105) [`c1a690c`](https://github.com/fiducy-dev/fiducy/commit/c1a690c908add0b808badeb8575aedd78935ce81) Thanks [@Benonii](https://github.com/Benonii)! - `fiducy init` asks where users add their key: in the chat, on the settings page, or on a page you name (`--widget chat|settings|/route`). It detects assistant-ui and AI SDK `useChat` to default to the chat, falls back to settings when there is no chat UI, and tells your coding agent never to put the key box in a header or layout. The model snippet now uses `createOpenAI(settings).responses(...)`, since OpenAI's current reasoning models refuse tool calls with reasoning on Chat Completions.
- Updated dependencies []:
  - @fiducy/sdk@0.3.0-beta.4

## 0.3.0-beta.3

### Patch Changes

- Updated dependencies []:
  - @fiducy/sdk@0.3.0-beta.3

## 0.3.0-beta.2

### Patch Changes

- Updated dependencies []:
  - @fiducy/sdk@0.3.0-beta.2

## 0.3.0-beta.1

### Patch Changes

- Updated dependencies []:
  - @fiducy/sdk@0.3.0-beta.1

## 0.3.0-beta.0

### Minor Changes

- [#63](https://github.com/fiducy-dev/fiducy/pull/63) [`23270c4`](https://github.com/fiducy-dev/fiducy/commit/23270c49f6b78b0f76319a898fc2e375490f0461) Thanks [@Benonii](https://github.com/Benonii)! - Add the `<fiducy-key provider="openai">` element (`@fiducy/sdk/element`) with thin wrappers for React (`FiducyKey` in `@fiducy/sdk/react`), Vue (`@fiducy/sdk/vue`), Svelte (`use:fiducyKey` from `@fiducy/sdk/svelte`) and Solid (`@fiducy/sdk/solid`). It reads its config from your key route, shows sign-in, connect, connected (with Replace and Remove) and error states, and fires `fiducy:connected`, `fiducy:removed` and `fiducy:error`. `fiducyToolkit()` no longer needs `gatewayURL` or `appID`.

### Patch Changes

- Updated dependencies [[`398522d`](https://github.com/fiducy-dev/fiducy/commit/398522d15a07552518063a1381195053c5d7b6e6), [`84dad6c`](https://github.com/fiducy-dev/fiducy/commit/84dad6cfe0c526d86cbed1f61a15a5b18dd918f0), [`23270c4`](https://github.com/fiducy-dev/fiducy/commit/23270c49f6b78b0f76319a898fc2e375490f0461), [`174f93d`](https://github.com/fiducy-dev/fiducy/commit/174f93de3c876d2ef6189a0acbaa5ff978ff5aaf), [`78993b5`](https://github.com/fiducy-dev/fiducy/commit/78993b53e2ce3da89cab80ac9790647408a67884), [`4ff02ad`](https://github.com/fiducy-dev/fiducy/commit/4ff02ad241fbd94e3a1f06182b2f86677dd8f90f), [`7e367bb`](https://github.com/fiducy-dev/fiducy/commit/7e367bbb8c7ea71fcaa9f62d436d8fcf7e3daf20), [`0386aca`](https://github.com/fiducy-dev/fiducy/commit/0386aca24899ad04a1a3df3d5135a25c8799aa02)]:
  - @fiducy/sdk@0.3.0-beta.0

## 0.2.0

### Patch Changes

- Updated dependencies [[`cadb608`](https://github.com/Benonii/fiducy/commit/cadb608900c74760cec3c617c81b327ce1d73640)]:
  - @fiducy/sdk@0.2.0
