import { mergeUsage, parseJSON, readUsage } from './usage.ts';

import type { TokenUsage, UsageOutcome } from './types.ts';

function readEventData(line: string): string | null {
  if (!line.startsWith('data:')) return null;
  const data = line.slice('data:'.length).trim();
  return data && data !== '[DONE]' ? data : null;
}

function createUsageObserver() {
  let pendingText = '';
  let usage: TokenUsage = { inputTokens: 0, outputTokens: 0 };

  const observeLines = (text: string) => {
    const lines = `${pendingText}${text}`.split('\n');
    pendingText = lines.pop() ?? '';
    for (const line of lines) {
      const data = readEventData(line.trim());
      if (data) usage = mergeUsage(usage, readUsage(parseJSON(data)));
    }
  };

  return { observeLines, readUsage: () => usage };
}

function reportUsageOnce(onUsage: (usage: TokenUsage, outcome: UsageOutcome) => void) {
  let hasReported = false;
  return (usage: TokenUsage, outcome: UsageOutcome) => {
    if (hasReported) return;
    hasReported = true;
    onUsage(usage, outcome);
  };
}

export function observeUsageInBody(
  body: NonNullable<Response['body']>,
  onUsage: (usage: TokenUsage, outcome: UsageOutcome) => void
): ReadableStream<Uint8Array> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const observer = createUsageObserver();
  const reportUsage = reportUsageOnce(onUsage);
  const readChunk = async () => {
    try {
      return await reader.read();
    } catch (error) {
      reportUsage(observer.readUsage(), 'interrupted');
      throw error;
    }
  };
  return new ReadableStream<Uint8Array>({
    pull: async (controller) => {
      const { done, value } = await readChunk();
      if (done) {
        observer.observeLines(`${decoder.decode()}\n`);
        reportUsage(observer.readUsage(), 'complete');
        controller.close();
        return;
      }
      controller.enqueue(value);
      observer.observeLines(decoder.decode(value, { stream: true }));
    },
    cancel: (reason) => {
      reportUsage(observer.readUsage(), 'interrupted');
      return reader.cancel(reason);
    }
  });
}
