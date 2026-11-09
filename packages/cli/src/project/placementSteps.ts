import { MODEL_CALL_DETAIL, REACT_FRAMEWORKS } from '../constants.ts';

import type { PlacementSection, ProjectInfo, Snippet, WidgetPlacement } from '../types.ts';

const MODEL_CALL = `import { respondToMissingKey } from '@fiducy/sdk/server';

const settings = await fiducy.providerSettings('openai', { request });
if (!settings.ok) return respondToMissingKey(settings);
const model = createOpenAI(settings).responses('gpt-4o-mini');`;

const ASSISTANT_UI_ROUTE = `import { requestKey, withoutKeyRequests } from '@fiducy/assistant-ui/server';
import { respondToMissingKey } from '@fiducy/sdk/server';

const settings = await fiducy.providerSettings('openai', { request });
if (!settings.ok && settings.reason === 'signed-out') return respondToMissingKey(settings);
if (!settings.ok) return requestKey({ provider: 'openai' });

const result = streamText({
  model: createOpenAI(settings).responses('gpt-4o-mini'),
  messages: await convertToModelMessages(withoutKeyRequests(messages), { tools }),
  tools
});`;

const ASSISTANT_UI_THREAD = `import { AuiConfig, Tools } from '@assistant-ui/react';
import { fiducyToolkit } from '@fiducy/assistant-ui';

const config = AuiConfig({ tools: Tools({ toolkit: fiducyToolkit() }) });

<AssistantRuntimeProvider runtime={runtime} config={config}>`;

const USE_CHAT_WIDGET = `import { FiducyKey, type GatewayProvider } from '@fiducy/sdk/react';

function readMissingProvider(error: Error | undefined): GatewayProvider | null {
  try {
    return JSON.parse(error?.message ?? '').data?.provider ?? null;
  } catch {
    return null;
  }
}

const { error, clearError, regenerate } = useChat();
const provider = readMissingProvider(error);

{provider && (
  <FiducyKey provider={provider} onConnected={() => { clearError(); regenerate(); }} />
)}`;

function modelStep(exportName: string): Snippet {
  return {
    title: "call the model with the user's key",
    file: 'your AI route',
    detail: MODEL_CALL_DETAIL,
    code: MODEL_CALL.replace('fiducy.', `${exportName}.`)
  };
}

function assistantUISection(project: ProjectInfo, exportName: string): PlacementSection {
  return {
    steps: [
      {
        title: 'ask for a key in the chat route',
        file: 'your chat route',
        detail: `Keep your other imports and options. ${MODEL_CALL_DETAIL}`,
        code: ASSISTANT_UI_ROUTE.replace('fiducy.', `${exportName}.`)
      },
      {
        title: 'register the key box in the thread',
        file: 'the component that creates your assistant-ui runtime',
        code: ASSISTANT_UI_THREAD
      }
    ],
    packages: project.dependencies['@fiducy/assistant-ui'] ? [] : ['@fiducy/assistant-ui']
  };
}

function useChatStep(project: ProjectInfo, widget: Snippet): Snippet {
  const title = 'show the key box in the chat when a key is missing';
  const file = 'the component that calls useChat';
  if (REACT_FRAMEWORKS.includes(project.framework)) return { title, file, code: USE_CHAT_WIDGET };
  return {
    title,
    file,
    detail:
      'Render it under the messages when the chat request fails; the error body has data.provider.',
    code: widget.code
  };
}

function pageStep(placement: WidgetPlacement, widget: Snippet): Snippet {
  if (placement.kind === 'route') {
    return { ...widget, title: `show the key widget on ${placement.route}`, file: placement.route };
  }
  return {
    ...widget,
    title: 'show the key widget on the settings page',
    file: 'your settings page',
    detail: 'No settings page yet? Create one at /settings.'
  };
}

export function buildPlacementSection(
  project: ProjectInfo,
  placement: WidgetPlacement,
  widget: Snippet,
  exportName: string
): PlacementSection {
  if (placement.kind === 'chat' && placement.chat === 'assistant-ui') {
    return assistantUISection(project, exportName);
  }
  if (placement.kind === 'chat') {
    return { steps: [useChatStep(project, widget), modelStep(exportName)], packages: [] };
  }
  return { steps: [pageStep(placement, widget), modelStep(exportName)], packages: [] };
}
