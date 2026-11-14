import { EVENT_STREAM_TYPE, STRIPPED_RESPONSE_HEADERS } from './constants.ts';
import { redactSecrets } from './redaction.ts';
import { copyHeadersWithout } from './request.ts';
import { observeUsageInBody } from './stream.ts';
import { parseJSON, readUsage } from './usage.ts';

import type { RelayResponseInput } from './types.ts';

export async function relayResponse({
  upstreamResponse,
  apiKey,
  onUsage
}: RelayResponseInput): Promise<Response> {
  const headers = copyHeadersWithout(upstreamResponse.headers, STRIPPED_RESPONSE_HEADERS);
  const responseInit = { status: upstreamResponse.status, headers };

  if (!upstreamResponse.ok) {
    const errorText = await upstreamResponse.text();
    return new Response(redactSecrets(errorText, apiKey), responseInit);
  }

  const isEventStream = headers.get('content-type')?.includes(EVENT_STREAM_TYPE) ?? false;
  if (isEventStream && upstreamResponse.body) {
    const observedBody = observeUsageInBody(upstreamResponse.body, onUsage);
    return new Response(observedBody, responseInit);
  }

  const bodyText = await upstreamResponse.text();
  onUsage(readUsage(parseJSON(bodyText)), 'complete');
  return new Response(bodyText, responseInit);
}
