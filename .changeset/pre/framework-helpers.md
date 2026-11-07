---
'@fiducy/sdk': minor
---

Framework helpers, modeled on Better Auth's: `toNextJsHandler` (`@fiducy/sdk/next`), `toTanStackHandlers` (`@fiducy/sdk/tanstack`), `toReactRouterHandlers` (`@fiducy/sdk/react-router`), `svelteKitHandler` for `hooks.server.ts` (`@fiducy/sdk/sveltekit`), `toNuxtHandler` (`@fiducy/sdk/nuxt`) and `toNodeHandler` / `toWebRequest` / `sendWebResponse` for Express, Fastify and NestJS (`@fiducy/sdk/node`). `createFiducy` also takes `env` for frameworks that keep `.env` out of `process.env`, such as SvelteKit 3.
