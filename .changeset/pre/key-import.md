---
'@fiducy/sdk': minor
---

Add `fiducy.importKeys()` to move API keys an app already stores into Fiducy. It skips users who already have a key for that provider, so it is safe to run again. The low-level client gains `importKeys(apiKeys)`.
