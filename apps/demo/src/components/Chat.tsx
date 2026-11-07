import {
  AssistantRuntimeProvider,
  AuiConfig,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  ThreadListItemPrimitive,
  ThreadListPrimitive,
  ThreadPrimitive,
  Tools
} from '@assistant-ui/react';
import { AssistantChatTransport, useChatRuntime } from '@assistant-ui/react-ai-sdk';
import { PROVIDER_LABELS, fiducyToolkit } from '@fiducy/assistant-ui';
import { useFiducyKeys } from '@fiducy/sdk/react-query';
import { lastAssistantMessageIsCompleteWithToolCalls } from 'ai';
import { useMemo, useRef, useState } from 'react';

import { KeysPanel } from '@/components/KeysPanel';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  CHAT_API_PATH,
  DEFAULT_MODEL_ID,
  DEMO_MODELS,
  FIDUCY_BASE_PATH,
  SUGGESTIONS
} from '@/lib/constants';
import { cn } from '@/lib/utils';

const MODEL_ITEMS = DEMO_MODELS.map((model) => ({ label: model.label, value: model.id }));

function ThreadListItem() {
  return (
    <ThreadListItemPrimitive.Root className="group">
      <ThreadListItemPrimitive.Trigger className="w-full cursor-pointer px-2.5 py-1.5 text-left text-muted-foreground text-sm hover:bg-accent hover:text-foreground group-data-active:bg-accent group-data-active:text-foreground">
        <ThreadListItemPrimitive.Title fallback="New chat" />
      </ThreadListItemPrimitive.Trigger>
    </ThreadListItemPrimitive.Root>
  );
}

export function Chat() {
  const [modelID, setModelID] = useState(DEFAULT_MODEL_ID);
  const modelRef = useRef(modelID);
  modelRef.current = modelID;
  const keysState = useFiducyKeys(FIDUCY_BASE_PATH);

  // The selected model rides along with every request; the server picks the user's key for it.
  const transport = useMemo(
    () =>
      new AssistantChatTransport({ api: CHAT_API_PATH, body: () => ({ model: modelRef.current }) }),
    []
  );
  const runtime = useChatRuntime({
    transport,
    // After the user saves a key in the thread, send the conversation again so the model answers.
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls
  });
  // The key box announces saved keys and useFiducyKeys refreshes itself, so no callback is needed here.
  const auiConfig = useMemo(
    () => AuiConfig({ tools: Tools({ toolkit: fiducyToolkit({ basePath: FIDUCY_BASE_PATH }) }) }),
    []
  );

  const selected = DEMO_MODELS.find((model) => model.id === modelID) ?? DEMO_MODELS[0];
  const hasKey = keysState.keys.some((key) => key.provider === selected?.provider);
  const providerLabel = selected ? PROVIDER_LABELS[selected.provider] : '';

  return (
    <AssistantRuntimeProvider runtime={runtime} config={auiConfig}>
      <div className="mx-auto grid h-screen max-w-7xl grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[264px_minmax(0,1fr)] md:grid-rows-1 md:border-x">
        <aside className="flex min-h-0 flex-col border-b md:border-r md:border-b-0 [&>*]:border-b [&>*]:border-dashed [&>*]:p-4">
          <div className="flex items-baseline gap-2.5 md:grid md:gap-0.5">
            <span className="font-bold text-foreground text-lg tracking-tight">Acme Chat</span>
            <span className="text-muted-foreground text-xs">Example app</span>
          </div>
          <ThreadListPrimitive.Root className="hidden flex-1 content-start gap-0.5 overflow-y-auto md:grid">
            <ThreadListPrimitive.New asChild>
              <Button variant="outline" size="sm" className="mb-2">
                New chat
              </Button>
            </ThreadListPrimitive.New>
            <ThreadListPrimitive.Items components={{ ThreadListItem }} />
          </ThreadListPrimitive.Root>
          <KeysPanel {...keysState} />
          <p className="hidden border-b-0! text-muted-foreground text-xs md:block">
            Keys sealed by{' '}
            <a className="text-foreground underline" href="https://github.com/fiducy-dev/fiducy">
              Fiducy
            </a>
          </p>
        </aside>

        <ThreadPrimitive.Root className="flex min-h-0 flex-col">
          <ThreadPrimitive.Viewport className="grid flex-1 content-start gap-5 overflow-y-auto px-4 py-8 md:px-16">
            <ThreadPrimitive.Empty>
              <div className="mx-auto mt-[12vh] grid max-w-xl gap-3 text-center">
                <h1 className="text-balance font-bold text-3xl text-foreground tracking-tight">
                  What can I help with?
                </h1>
                <p className="text-muted-foreground text-sm">
                  Pick any model. If you have no key for it yet, the chat asks for one right here.
                  Acme never sees it.
                </p>
                <div className="mt-3 grid gap-2">
                  {SUGGESTIONS.map((prompt) => (
                    <ThreadPrimitive.Suggestion key={prompt} prompt={prompt} send asChild>
                      <Button
                        variant="outline"
                        className="h-auto justify-start whitespace-normal py-3 text-left"
                      >
                        {prompt}
                      </Button>
                    </ThreadPrimitive.Suggestion>
                  ))}
                </div>
              </div>
            </ThreadPrimitive.Empty>
            <ThreadPrimitive.Messages>
              {({ message }) => (
                <MessagePrimitive.Root
                  className="mx-auto grid w-full max-w-3xl gap-1.5"
                  data-role={message.role}
                >
                  <div
                    className={cn(
                      'grid gap-2.5 whitespace-pre-wrap',
                      message.role === 'user' &&
                        'max-w-4/5 justify-self-end bg-muted px-3.5 py-2.5 text-foreground'
                    )}
                  >
                    <MessagePrimitive.Parts />
                  </div>
                  <MessagePrimitive.Error>
                    <ErrorPrimitive.Root className="text-destructive text-sm">
                      <ErrorPrimitive.Message />
                    </ErrorPrimitive.Root>
                  </MessagePrimitive.Error>
                </MessagePrimitive.Root>
              )}
            </ThreadPrimitive.Messages>
          </ThreadPrimitive.Viewport>

          <ComposerPrimitive.Root className="mx-auto mb-5 grid w-[min(720px,calc(100%-32px))] gap-2 border border-input p-3 focus-within:border-foreground">
            <ComposerPrimitive.Input
              className="min-h-6 resize-none bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
              placeholder="Message Acme Chat"
              aria-label="Message"
              rows={1}
            />
            <div className="flex items-center gap-2.5 border-t border-dashed pt-2">
              <Select
                items={MODEL_ITEMS}
                value={modelID}
                onValueChange={(value) => value && setModelID(value)}
              >
                <SelectTrigger aria-label="Model" size="sm" className="w-auto min-w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup>
                  {MODEL_ITEMS.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
              <span
                className={cn(
                  'hidden font-mono text-muted-foreground text-xs sm:inline',
                  hasKey && 'text-foreground'
                )}
              >
                {hasKey ? `Your ${providerLabel} key` : `No ${providerLabel} key yet`}
              </span>
              <ComposerPrimitive.Send asChild>
                <Button size="sm" className="ml-auto">
                  Send
                </Button>
              </ComposerPrimitive.Send>
            </div>
          </ComposerPrimitive.Root>
        </ThreadPrimitive.Root>
      </div>
    </AssistantRuntimeProvider>
  );
}
