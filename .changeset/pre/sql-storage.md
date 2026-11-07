---
'@fiducy/sdk': minor
---

Add SQL storage: `kyselyStorage` from `@fiducy/sdk/storage/kysely` keeps handles in Postgres, MySQL or SQLite using the connection the app already has (pg, mysql2, better-sqlite3, bun:sqlite, node:sqlite or Kysely). `getMigrations` creates the table, `generateSchema` from `@fiducy/sdk/storage` returns the SQL, and `fiducy.storage` exposes the storage so tools can generate and migrate.
