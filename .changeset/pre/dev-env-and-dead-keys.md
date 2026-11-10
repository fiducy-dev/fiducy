---
'fiducy': patch
'@fiducy/assistant-ui': minor
---

`fiducy dev` now keeps your env files in step with the dev gateway. It adds missing `FIDUCY_*` lines to an existing `.env`, and it replaces stale dev values (`app_dev_…`, `fsk_dev_…`, a localhost gateway URL) after you reset `.fiducy/`. Values from a real gateway are left alone. `@fiducy/assistant-ui/server` adds `streamWithKeyRequests`: when a saved key turns out to be gone mid-chat, the thread shows the key box instead of an error.
