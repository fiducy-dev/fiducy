---
'@fiducy/core': minor
---

Add `@fiducy/core/attestation`: `verifyNitroAttestation` checks an AWS Nitro Enclaves attestation document in the browser or on the server with WebCrypto only. It verifies the COSE_Sign1 signature, the certificate chain up to the pinned AWS Nitro root, the nonce, and that PCR0 is one of the values you expect, and it refuses debug-mode enclaves.
