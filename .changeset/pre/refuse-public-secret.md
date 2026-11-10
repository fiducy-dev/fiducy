---
'@fiducy/sdk': patch
'fiducy': patch
---

Refuse a public app secret before anything runs. `createFiducy` now throws as soon as it is called when `FIDUCY_APP_SECRET` sits in a public env var (`NEXT_PUBLIC_`, `VITE_`, `PUBLIC_`, `NUXT_PUBLIC_`, `EXPO_PUBLIC_`, `REACT_APP_`), instead of waiting for the first request, and `fiducy dev` refuses to start while one of those names is in your env files.
