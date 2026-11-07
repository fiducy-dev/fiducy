---
'@fiducy/sdk': minor
'@fiducy/assistant-ui': minor
---

Add the `<fiducy-key provider="openai">` element (`@fiducy/sdk/element`) with thin wrappers for React (`FiducyKey` in `@fiducy/sdk/react`), Vue (`@fiducy/sdk/vue`), Svelte (`use:fiducyKey` from `@fiducy/sdk/svelte`) and Solid (`@fiducy/sdk/solid`). It reads its config from your key route, shows sign-in, connect, connected (with Replace and Remove) and error states, and fires `fiducy:connected`, `fiducy:removed` and `fiducy:error`. `fiducyToolkit()` no longer needs `gatewayURL` or `appID`.
