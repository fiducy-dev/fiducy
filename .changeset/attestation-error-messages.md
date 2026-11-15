---
'@fiducy/core': patch
---

Export `ATTESTATION_ERROR_MESSAGES` from `@fiducy/core/attestation`: a plain description of each attestation error, without the "No key was sent" wording of `describeAttestationError`, for tools that check a gateway without sending a key.
