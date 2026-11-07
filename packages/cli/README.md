# fiducy

The Fiducy command line. It adds Fiducy to an app you already have; it never creates a new app and never edits a file you already have.

```sh
npx fiducy init       # server module + key route for your framework, installs @fiducy/sdk
npx fiducy dev        # local gateway on 127.0.0.1:3438, writes .env if you have none
npx fiducy generate   # the storage table in your ORM's format (SQL, Drizzle, Prisma)
npx fiducy migrate    # create the table with Kysely storage (Postgres, MySQL, SQLite)
```

`init` detects Next.js, TanStack Start, React Router, SvelteKit, Nuxt, Farm.js, Express and Hono; Better Auth, Auth.js and Clerk; and a Prisma, Drizzle or Kysely database export. Anything it cannot create as a new file is printed for you to paste.

`dev` keeps a dev app ID, app secret and master key in `.fiducy/` (git-ignored, mode 0600), so saved keys survive restarts. `--mock` answers model calls with a fake model. `--origin` allows another origin to show the key widget.

Docs: https://fiducy.dev/docs/cli
