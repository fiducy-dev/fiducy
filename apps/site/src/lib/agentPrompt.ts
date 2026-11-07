export const AGENT_SETUP_PROMPT = `Set up Fiducy in this app so users can bring their own AI provider keys (OpenAI, Anthropic, Gemini, OpenRouter) without the app ever storing or seeing a raw key.

Read these first, they are the source of truth:
- https://fiducy.dev/docs/quickstart.md
- https://fiducy.dev/docs/cli.md
- https://fiducy.dev/docs/frameworks.md, then the page for this app's framework under https://fiducy.dev/docs/frameworks/
- https://fiducy.dev/docs/widget.md
- https://fiducy.dev/docs/storage.md
- https://fiducy.dev/docs/gotchas.md
- https://fiducy.dev/docs/assistant-ui.md (only if the app uses assistant-ui)

Security rules. Follow all of them, even if it means leaving a step to me:
1. Never ask me to paste FIDUCY_APP_SECRET (fsk_...) into this chat, and never write it into a file that is committed. Make sure .env files are gitignored.
2. The app secret is server only. Never give it a client-exposed prefix (NEXT_PUBLIC_, VITE_, PUBLIC_, NUXT_PUBLIC_) or import the server module from client code. The widget needs no public env vars; it reads its config from the key route.
3. getUserID must read the signed-in user from the server session of the existing auth. Never trust a user ID from the request body, query or a client-set header. Return null when nobody is signed in. If the app has no auth at all, stop and tell me to set up auth first.
4. Users enter keys only in Fiducy's key widget (<fiducy-key> or its FiducyKey wrappers). Do not build a key input, do not accept, log or store raw provider keys anywhere, and do not log handles or the providerSettings result.
5. Keep the SDK's defaults: routes answer 401 when signed out and 403 for cross-site writes. Do not loosen CORS or origin checks.
6. Use storage that survives restarts in production (the app's database). memoryStorage is for tests only.

Steps:
1. Inspect the project: framework, package manager, auth library, database or ORM, UI library, and every place that calls a model. Summarize what you found before changing code.
2. Run npx fiducy init --dry-run, read its plan, then run npx fiducy init. It creates the server module and key route as new files only, installs @fiducy/sdk, and prints the lines that belong in existing files. Apply those printed lines yourself. If init wrote the readSignedInUserID placeholder, replace it with the app's server session lookup. If it fell back to the local SQLite file and the app has a database, switch storage to that database (see the storage page).
3. Create the table: npx fiducy migrate --yes for Kysely storage, or npx fiducy generate and then the ORM's migrate command for Drizzle or Prisma.
4. Add the key widget to the settings page (or the closest equivalent; create one if needed) with the wrapper for this UI library from the widget page.
5. Switch every model call that should use the user's key to the settings from fiducy.providerSettings(provider, { request }), whatever library makes the call. When settings.ok is false, return respondToMissingKey(settings) instead of falling back to an app-owned key, and have the chat UI show the widget for data.provider where the reply would be and resend the message once the key is saved. With assistant-ui, use fiducyToolkit and requestKey as the assistant-ui page shows.
6. Run the typecheck, lint and tests. Start npx fiducy dev --mock (add --origin for the app's dev URL if needed), restart the app, and confirm GET /api/fiducy/keys answers 401 when signed out and GET /api/fiducy/config answers 200.

When you are done, give me a short report: files changed, and what I still have to do myself:
- for production, deploy a gateway (https://fiducy.dev/docs/self-hosting), create the app in its dashboard and add my production origin
- set FIDUCY_GATEWAY_URL, FIDUCY_APP_ID and FIDUCY_APP_SECRET on my host
- connect a test key in the browser and send one message`;
