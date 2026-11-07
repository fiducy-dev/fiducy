---
'@fiducy/sdk': minor
'@fiducy/core': minor
---

Zero-setup server SDK. `createFiducy` reads `FIDUCY_GATEWAY_URL`, `FIDUCY_APP_ID` and `FIDUCY_APP_SECRET` from server env when the options are left out, refuses to run when the app secret sits in a public env var, and serves `GET {basePath}/config` so the browser needs no config of its own. `providerSettings(provider, { request } | { headers } | { userID })` now returns `{ ok: true, ...settings, fetch }` or `{ ok: false, reason: 'signed-out' | 'no-key' }` (breaking: it used to return `null`), with `respondToMissingKey()` for the 401/409 answer. The returned `fetch` drops a stored handle the gateway no longer has and turns gateway errors into readable provider-shaped errors. Key writes now take only `application/json` bodies up to 16 KB.
