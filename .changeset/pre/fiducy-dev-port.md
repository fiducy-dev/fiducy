---
'fiducy': patch
---

`fiducy dev` now listens on port 3438 (FIDU on a phone keypad) instead of 8787, so it no longer clashes with the repo prototype gateway. `fiducy init --framework farm` is now `--framework farmjs`, so it isn't confused with farm-fe.
