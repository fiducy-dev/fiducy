# @fiducy/widget

## 0.3.0-beta.7

### Minor Changes

- [#131](https://github.com/fiducy-dev/fiducy/pull/131) [`4359731`](https://github.com/fiducy-dev/fiducy/commit/4359731958cc2d8ae93f12a28a4267dcd8289ac4) Thanks [@Benonii](https://github.com/Benonii)! - The widget and `importKeys` now check the gateway's Nitro attestation before any key leaves the browser or your server. Set `FIDUCY_ENCLAVE_PCR0` and `FIDUCY_ENCLAVE_PCR16` to the values your deploy printed (comma-separate several during a rollover); the check needs both, and PCR0 without PCR16 is refused before anything is sent. Gateways on `localhost` with neither set are not checked. A remote gateway with no expected PCRs is refused unless you set `FIDUCY_SKIP_ATTESTATION=true`, which is for test gateways that are not in an enclave. `mountKeyWidget`, `KeyWidget`, `ConnectKeyWidget`, `<fiducy-key>` (`enclave-pcr0`, `enclave-pcr16`, `skip-attestation`) and the framework wrappers take the same options. Both sides share `checkGateway` from `@fiducy/core/attestation`, which fails closed on any error and gives up on a gateway that takes over 10 seconds. `verifyGatewayAttestation` requires `enclavePCR16`. If your app sends a Content Security Policy, allow the gateway origin in `connect-src`. The gateway now serves `/attestation` with CORS so the browser can read it.

### Patch Changes

- Updated dependencies [[`4359731`](https://github.com/fiducy-dev/fiducy/commit/4359731958cc2d8ae93f12a28a4267dcd8289ac4), [`c0abaa0`](https://github.com/fiducy-dev/fiducy/commit/c0abaa0c41dbfefb9d114443d979b2ad9dd4fbab)]:
  - @fiducy/core@0.3.0-beta.7

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

### Patch Changes

- [#60](https://github.com/fiducy-dev/fiducy/pull/60) [`b83c939`](https://github.com/fiducy-dev/fiducy/commit/b83c9394f4778c61985644c3dbe5df42ff949af5) Thanks [@Benonii](https://github.com/Benonii)! - Name the missing or invalid `gatewayURL` or `appID` in the error, instead of the browser's "undefined is not a valid URL".

## 0.2.0

No changes in this release.
