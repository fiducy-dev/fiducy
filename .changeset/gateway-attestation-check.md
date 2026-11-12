---
'@fiducy/core': minor
'@fiducy/widget': minor
'@fiducy/sdk': minor
'@fiducy/assistant-ui': minor
'fiducy': patch
---

The widget and `importKeys` now check the gateway's Nitro attestation before any key leaves the browser or your server. Set `FIDUCY_ENCLAVE_PCR0` and `FIDUCY_ENCLAVE_PCR16` to the values your deploy printed (comma-separate several during a rollover); the check needs both, and PCR0 without PCR16 is refused before anything is sent. Gateways on `localhost` with neither set are not checked. A remote gateway with no expected PCRs is refused unless you set `FIDUCY_SKIP_ATTESTATION=true`, which is for test gateways that are not in an enclave. `mountKeyWidget`, `KeyWidget`, `ConnectKeyWidget`, `<fiducy-key>` (`enclave-pcr0`, `enclave-pcr16`, `skip-attestation`) and the framework wrappers take the same options. The gateway now serves `/attestation` with CORS so the browser can read it.
