# Fiducy

Key custody for bring-your-own-key apps. Users paste their AI provider key into an embedded Fiducy widget, the app stores only a handle, and every AI call goes through the Fiducy gateway, which decrypts the key in memory, forwards the request and streams the response back. The app never stores user keys, and neither does Fiducy's database.

## Layout

| Path | What it is |
|---|---|
| `packages/core` | Crypto core: AES-256-GCM sealing, split data keys, handles, key wrapping |
| `packages/providers` | Provider adapters: header swap, path allowlist, error redaction, streaming usage |
| `packages/widget` | Browser client that mounts the key widget iframe |
| `packages/sdk` | App SDK: AI SDK provider settings, revoke helper, React `KeyWidget` |
| `packages/farm` | Farm.js integration: mounts the SDK's route handler |
| `packages/assistant-ui` | assistant-ui toolkit: the key box opens inside the chat thread |
| `packages/testing` | Shared fixtures and a mock AI provider |
| `apps/gateway` | The gateway server |
| `apps/control-plane` | Farm.js developer dashboard and control plane: accounts, apps, hashed app secrets, limits, usage |
| `apps/demo` | Farm.js and assistant-ui chat where users bring their own OpenAI key |

## Packages

```sh
npm install @fiducy/sdk
```

All `@fiducy/*` packages are released together with the same version, built in GitHub Actions and published to npm with provenance. Most apps only need `@fiducy/sdk`: it works in any framework that handles a Web `Request`. Optional extras: `@fiducy/widget` for non-React UIs, `@fiducy/farm` for Farm.js, `@fiducy/assistant-ui` for assistant-ui chats. `@fiducy/core` and `@fiducy/providers` are the building blocks underneath.

## Development

```sh
bun install
bun test
bun run typecheck
bun run lint
```

## Running the control plane with the gateway

```sh
cd apps/control-plane
FIDUCY_GATEWAY_TOKEN=change-me FIDUCY_GATEWAY_URL=http://localhost:8787 bun run dev

cd apps/gateway
FIDUCY_MASTER_KEY=<32 random bytes, base64url> \
FIDUCY_CONTROL_PLANE_URL=http://localhost:3000 \
FIDUCY_GATEWAY_TOKEN=change-me \
bun run start
```

The control plane never handles user keys. It sends the gateway app configs (with only the SHA-256 hash of each app secret) and receives token counts. Locally it stores data in `.farm/`; set `DATABASE_URL` to use Postgres.

## Using the SDK

```ts
import { createOpenAI } from '@ai-sdk/openai';
import { createGatewayClient } from '@fiducy/sdk';

const fiducy = createGatewayClient({ gatewayURL, appSecret: process.env.FIDUCY_APP_SECRET });
const openai = createOpenAI(fiducy.providerSettings('openai', user.keyHandle));
```

In the browser, `<KeyWidget gatewayURL appID onHandle />` from `@fiducy/sdk/react` shows the key form and gives you the handle. Store the handle with the user on your server. `fiducy.revokeKey(handle)` deletes a key.

## Running the demo chat

```sh
cd apps/gateway
FIDUCY_MASTER_KEY=<32 random bytes, base64url> \
FIDUCY_APPS_JSON='[{"appID":"app_demo","name":"Demo","appSecret":"fsk_demo_local","monthlyRequestLimitPerKey":100,"allowedOrigins":["http://localhost:3000"]}]' \
bun run start

cd apps/demo
FIDUCY_GATEWAY_URL=http://localhost:8787 FIDUCY_APP_ID=app_demo FIDUCY_APP_SECRET=fsk_demo_local bun run dev
```

The demo is an assistant-ui chat. Pick a model; if you have no key for that provider, the reply opens the key box inside the thread (see `packages/assistant-ui`). Handles are stored server side per demo user.

## Releasing

Add a changeset to your pull request with `bunx changeset`. Merging to main opens a "Version packages" pull request; merging that one publishes to npm and tags the release.

## License

Apache-2.0. See [LICENSE](./LICENSE).

## Contributing and security

See [CONTRIBUTING.md](CONTRIBUTING.md) to set up the repo and open a pull request. Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md), never in a public issue.
