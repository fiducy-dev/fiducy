# Attestation test fixtures

- `nitroDebugDocument.bin` is a real attestation document from a debug-mode AWS Nitro enclave, copied from the Apache-2.0 [aws-nitro-enclaves-attestation](https://github.com/ppmag/aws-nitro-enclaves-attestation) crate (`tests/data/nitro_ad_debug.bin`). It is signed by the real AWS Nitro root, has no nonce and all-zero PCRs.
- `certificates.ts` holds a throwaway P-384 test root, intermediate and leaf (plus a leaf issued by a non-CA certificate) made with `openssl` for these tests only. Their private keys protect nothing.
