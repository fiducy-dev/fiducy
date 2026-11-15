---
'@fiducy/core': patch
'@fiducy/widget': patch
'@fiducy/sdk': patch
---

Accept attestation documents whose payload AWS signed as an indefinite-length CBOR map. Current Nitro enclaves issue these, and the verifier refused them as `malformed_document`, so the widget and `importKeys` would not send keys to a real enclave gateway. Indefinite-length maps and arrays are now read under the same item and nesting limits; indefinite-length strings are still refused.
