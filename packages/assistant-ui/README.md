# @fiducy/assistant-ui

Bring-your-own-key for [assistant-ui](https://www.assistant-ui.com) apps. When a user has no key for the model they picked, the assistant asks for one inside the thread. The key box is a Fiducy iframe, so the key goes from the user's keyboard into the enclave and your app only stores a handle.

## Install

```sh
npm install @fiducy/sdk @fiducy/assistant-ui
```

Full guide: [assistant-ui docs](https://fiducy.dev/docs/assistant-ui).

## Client

Register the toolkit next to your own tools, and resend once the user saves a key:

```tsx
import { AssistantRuntimeProvider, AuiConfig, Tools } from '@assistant-ui/react';
import { AssistantChatTransport, useChatRuntime } from '@assistant-ui/react-ai-sdk';
import { fiducyToolkit } from '@fiducy/assistant-ui';
import { lastAssistantMessageIsCompleteWithToolCalls } from 'ai';

const runtime = useChatRuntime({
  transport: new AssistantChatTransport({ api: '/api/chat', body: () => ({ model }) }),
  sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls
});
const config = AuiConfig({
  tools: Tools({ toolkit: { ...fiducyToolkit({ gatewayURL, appID }), ...yourTools } })
});

<AssistantRuntimeProvider runtime={runtime} config={config}>{/* thread */}</AssistantRuntimeProvider>;
```

`connect_api_key` is a human tool. The model can call it too, for example when the user asks to add a Claude key.

## Server

```ts
import { frontendTools } from '@assistant-ui/react-ai-sdk';
import { requestKey, withoutKeyRequests } from '@fiducy/assistant-ui/server';
import { respondToMissingKey } from '@fiducy/sdk/server';

const settings = await fiducy.providerSettings(provider, { request });
if (!settings.ok && settings.reason === 'signed-out') return respondToMissingKey(settings);
if (!settings.ok) return requestKey({ provider }); // the key box opens in the thread

const tools = frontendTools(body.tools);
const result = streamText({
  model: createOpenAI(settings).responses('gpt-5-mini'),
  messages: await convertToModelMessages(withoutKeyRequests(body.messages), { tools }),
  tools
});
return result.toUIMessageStreamResponse();
```

`requestKey` answers with a short message and a `connect_api_key` call, without calling a model. `withoutKeyRequests` removes those turns before the next model call, so the model answers the user's original question.

## Styling

The tool renders plain elements with `fiducy-tool`, `fiducy-tool-title`, `fiducy-tool-widget`, `fiducy-tool-error` and `fiducy-tool-done` classes. Style them to match your thread.
