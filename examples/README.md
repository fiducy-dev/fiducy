# Fiducy examples

One small app per framework, each wired the way the docs describe. The same flow runs against every app in the browser (`bun run test:examples`): sign in, connect a key in `<fiducy-key>`, ask the model, then lose the key at the gateway and watch the app ask for it again.

| Example | Server helper | Key box |
| --- | --- | --- |
| `next` | `toNextJsHandler` from `@fiducy/sdk/next` | `FiducyKey` from `@fiducy/sdk/react` |
| `tanstack-start` | `toTanStackHandlers` from `@fiducy/sdk/tanstack` | `FiducyKey` from `@fiducy/sdk/react` |
| `react-router` | `toReactRouterHandlers` from `@fiducy/sdk/react-router` | `FiducyKey` from `@fiducy/sdk/react` |
| `sveltekit` | `svelteKitHandler` from `@fiducy/sdk/sveltekit` | `use:fiducyKey` from `@fiducy/sdk/svelte` |
| `nuxt` | `toNuxtHandler` from `@fiducy/sdk/nuxt` | `FiducyKey` from `@fiducy/sdk/vue` |
| `express` | `toNodeHandler` from `@fiducy/sdk/node` | `<fiducy-key>` from `@fiducy/sdk/element` |
| `farm` | `fiducy()` from `@fiducy/farm` | `FiducyKey` from `@fiducy/sdk/react` |

Each example has its own `example-kit` folder that stands in for your own auth and storage: a signed test-user cookie and a JSON file. Replace both with your real ones. The examples depend on the published `@fiducy/*` packages, so each folder works on its own.

## Run one on its own

```bash
npx degit fiducy-dev/fiducy/examples/next my-app
cd my-app
npm install
npx fiducy dev --mock
```

`fiducy dev` writes its settings to `.env` and keeps running. In a second terminal:

```bash
npm run dev
```

## Run one inside this repository

Inside the repository, the same ranges resolve to the local packages, so the examples run against your changes.

1. `bun install` and `bun run build` at the repository root.
2. In the example folder, start a local gateway: `node ../../packages/cli/dist/index.js dev --mock` (in your own app this is `npx fiducy dev --mock`). It writes `.env` with the three `FIDUCY_` values.
3. `bun run dev` in the example folder. The test sign-in keeps a random session secret in `.data/` (set `EXAMPLE_SESSION_SECRET` to use your own).
