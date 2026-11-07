import { WIDGET_DEFAULT_HEIGHT, WIDGET_MESSAGE_TYPES } from './constants.ts';

import type { MountKeyWidgetOptions, MountedKeyWidget, WidgetMessage } from './types.ts';

function buildWidgetURL(gatewayURL: string, appID: string): string {
  const widgetURL = new URL('/widget', gatewayURL);
  widgetURL.searchParams.set('app', appID);
  widgetURL.searchParams.set('origin', window.location.origin);
  return widgetURL.toString();
}

function createWidgetFrame(gatewayURL: string, appID: string): HTMLIFrameElement {
  const iframe = document.createElement('iframe');
  iframe.src = buildWidgetURL(gatewayURL, appID);
  iframe.title = 'Connect your API key';
  iframe.style.border = '0';
  iframe.style.width = '100%';
  iframe.style.height = WIDGET_DEFAULT_HEIGHT;
  return iframe;
}

/** Fails early with a clear message instead of the browser's "undefined is not a valid URL". */
function assertWidgetOptions(gatewayURL: string, appID: string): void {
  if (!gatewayURL)
    throw new Error(
      'Fiducy: gatewayURL is missing. Pass your gateway URL, for example from a public env var such as NEXT_PUBLIC_FIDUCY_GATEWAY_URL.'
    );
  if (!URL.canParse(gatewayURL))
    throw new Error(
      `Fiducy: gatewayURL "${gatewayURL}" is not a valid URL. Use the full URL, for example http://localhost:3438.`
    );
  if (!appID)
    throw new Error(
      'Fiducy: appID is missing. Pass your app ID, for example from a public env var such as NEXT_PUBLIC_FIDUCY_APP_ID.'
    );
}

export function mountKeyWidget({
  gatewayURL,
  appID,
  container,
  onHandle,
  onError
}: MountKeyWidgetOptions): MountedKeyWidget {
  assertWidgetOptions(gatewayURL, appID);
  const gatewayOrigin = new URL(gatewayURL).origin;
  const iframe = createWidgetFrame(gatewayURL, appID);

  const handleMessage = (event: MessageEvent<WidgetMessage>) => {
    if (event.origin !== gatewayOrigin || event.source !== iframe.contentWindow) return;
    if (event.data?.type === WIDGET_MESSAGE_TYPES.handle)
      onHandle(event.data.handle, event.data.record);
    if (event.data?.type === WIDGET_MESSAGE_TYPES.error) onError?.(event.data.message);
  };

  window.addEventListener('message', handleMessage);
  container.appendChild(iframe);
  return {
    iframe,
    unmount: () => {
      window.removeEventListener('message', handleMessage);
      iframe.remove();
    }
  };
}
