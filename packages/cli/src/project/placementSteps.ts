import { REACT_FRAMEWORKS } from '../constants.ts';
import {
  describeModelCall,
  readPrimaryProvider,
  readProviderCode,
  withProvider
} from './providers.ts';

import type { PlacementSection, ProjectInfo, Snippet, WidgetPlacement } from '../types.ts';

const MODEL_CALL = `import { respondToMissingKey } from '@fiducy/sdk/server';

const settings = await fiducy.providerSettings('PROVIDER', { request });
if (!settings.ok) return respondToMissingKey(settings);
const model = MODEL;`;

const ASSISTANT_UI_ROUTE = `import { requestKey, streamWithKeyRequests, withoutKeyRequests } from '@fiducy/assistant-ui/server';
import { respondToMissingKey } from '@fiducy/sdk/server';

const settings = await fiducy.providerSettings('PROVIDER', { request });
if (!settings.ok && settings.reason === 'signed-out') return respondToMissingKey(settings);
if (!settings.ok) return requestKey({ provider: 'PROVIDER' });

const result = streamText({
  model: MODEL,
  messages: await convertToModelMessages(withoutKeyRequests(messages), { tools }),
  tools
});
return streamWithKeyRequests({ provider: 'PROVIDER', stream: result.stream, tools });`;

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

function fillTemplate(template: string, project: ProjectInfo, exportName: string): string {
  const provider = readPrimaryProvider(project);
  return template
    .replace('fiducy.', `${exportName}.`)
    .replaceAll('PROVIDER', provider)
    .replace('MODEL', readProviderCode(provider).model);
}

function modelStep(project: ProjectInfo, exportName: string): Snippet {
  return {
    title: "call the model with the user's key",
    file: 'your AI route',
    detail: describeModelCall(project),
    code: fillTemplate(MODEL_CALL, project, exportName)
  };
}

function assistantUISection(project: ProjectInfo, exportName: string): PlacementSection {
  return {
    steps: [
      {
        title: 'ask for a key in the chat route',
        file: 'your chat route',
        detail: `Keep your other imports and options. ${describeModelCall(project)}`,
        code: fillTemplate(ASSISTANT_UI_ROUTE, project, exportName)
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
    code: withProvider(widget.code, readPrimaryProvider(project))
  };
}

function pageStep(project: ProjectInfo, placement: WidgetPlacement, base: Snippet): Snippet {
  const widget = { ...base, code: withProvider(base.code, readPrimaryProvider(project)) };
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
    return { steps: [useChatStep(project, widget), modelStep(project, exportName)], packages: [] };
  }
  return {
    steps: [pageStep(project, placement, widget), modelStep(project, exportName)],
    packages: []
  };
}
