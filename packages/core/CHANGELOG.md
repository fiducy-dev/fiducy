# @fiducy/core

## 0.3.0-beta.8

No changes in this release.

## 0.3.0-beta.7

### Minor Changes

- [#131](https://github.com/fiducy-dev/fiducy/pull/131) [`4359731`](https://github.com/fiducy-dev/fiducy/commit/4359731958cc2d8ae93f12a28a4267dcd8289ac4) Thanks [@Benonii](https://github.com/Benonii)! - The widget and `importKeys` now check the gateway's Nitro attestation before any key leaves the browser or your server. Set `FIDUCY_ENCLAVE_PCR0` and `FIDUCY_ENCLAVE_PCR16` to the values your deploy printed (comma-separate several during a rollover); the check needs both, and PCR0 without PCR16 is refused before anything is sent. Gateways on `localhost` with neither set are not checked. A remote gateway with no expected PCRs is refused unless you set `FIDUCY_SKIP_ATTESTATION=true`, which is for test gateways that are not in an enclave. `mountKeyWidget`, `KeyWidget`, `ConnectKeyWidget`, `<fiducy-key>` (`enclave-pcr0`, `enclave-pcr16`, `skip-attestation`) and the framework wrappers take the same options. Both sides share `checkGateway` from `@fiducy/core/attestation`, which fails closed on any error and gives up on a gateway that takes over 10 seconds. `verifyGatewayAttestation` requires `enclavePCR16`. If your app sends a Content Security Policy, allow the gateway origin in `connect-src`. The gateway now serves `/attestation` with CORS so the browser can read it.

- [#85](https://github.com/fiducy-dev/fiducy/pull/85) [`c0abaa0`](https://github.com/fiducy-dev/fiducy/commit/c0abaa0c41dbfefb9d114443d979b2ad9dd4fbab) Thanks [@Benonii](https://github.com/Benonii)! - Add `@fiducy/core/attestation`: `verifyNitroAttestation` checks an AWS Nitro Enclaves attestation document in the browser or on the server with WebCrypto only. It verifies the COSE_Sign1 signature, the certificate chain up to the pinned AWS Nitro root (CA flag, keyCertSign, path length and critical extensions), the nonce, that PCR0 and PCR16 are among the values you pass in `expectedPCR0s` and `expectedPCR16s` (both required, so the genuine image running someone else's deployment config is refused); it refuses debug-mode enclaves. The result carries `pcr0` and `pcr16` (`null` when the document has no PCR16). Errors include `unexpected_pcr16` and `webcrypto_unavailable` (no `crypto.subtle`, as on a plain-HTTP origin). Caller mistakes throw a `TypeError` instead: an empty nonce (send at least 16 random bytes), an empty `expectedPCR0s` or `expectedPCR16s`, or a value that is not a 96-character hex measurement. `encodeCBOR` is exported for the gateway's secure module requests.

## 0.3.0-beta.6

No changes in this release.

## 0.3.0-beta.5

No changes in this release.

## 0.3.0-beta.4

No changes in this release.

## 0.3.0-beta.3

No changes in this release.

## 0.3.0-beta.2

No changes in this release.

## 0.3.0-beta.1

No changes in this release.

## 0.3.0-beta.0

### Minor Changes

- [#61](https://github.com/fiducy-dev/fiducy/pull/61) [`0386aca`](https://github.com/fiducy-dev/fiducy/commit/0386aca24899ad04a1a3df3d5135a25c8799aa02) Thanks [@Benonii](https://github.com/Benonii)! - Zero-setup server SDK. `createFiducy` reads `FIDUCY_GATEWAY_URL`, `FIDUCY_APP_ID` and `FIDUCY_APP_SECRET` from server env when the options are left out, refuses to run when the app secret sits in a public env var, and serves `GET {basePath}/config` so the browser needs no config of its own. `providerSettings(provider, { request } | { headers } | { userID })` now returns `{ ok: true, ...settings, fetch }` or `{ ok: false, reason: 'signed-out' | 'no-key' }` (breaking: it used to return `null`), with `respondToMissingKey()` for the 401/409 answer. The returned `fetch` drops a stored handle the gateway no longer has and turns gateway errors into readable provider-shaped errors. Key writes now take only `application/json` bodies up to 16 KB.

## 0.2.0

No changes in this release.
