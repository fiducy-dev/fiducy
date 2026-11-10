---
'fiducy': patch
---

`fiducy generate` works again after you delete `fiducy-schema.ts`. Your app imports that file, so loading it failed with "Cannot find module './fiducy-schema'"; generate now falls back to the dialect in drizzle.config and rewrites the table. When your schema file already exports it, the hint says so instead of asking you to add it.
