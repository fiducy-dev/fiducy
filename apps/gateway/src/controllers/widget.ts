import { WIDGET_FONT } from '../widget/font';
import { buildWidgetSecurityHeaders, renderWidgetPage } from '../widget/page';

import type { GatewayDependencies, WidgetProtection } from '../types';

function createNonce(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64');
}

function readProtection({ attest, mockProviders }: GatewayDependencies): WidgetProtection {
  if (attest) return 'enclave';
  return mockProviders ? 'test' : 'unattested';
}

export async function serveWidget(request: Request, dependencies: GatewayDependencies) {
  const { appDirectory } = dependencies;
  const searchParams = new URL(request.url).searchParams;
  const app = await appDirectory.findApp(searchParams.get('app') ?? '');
  if (!app) return new Response('This app is not registered', { status: 404 });
  const parentOrigin = searchParams.get('origin') ?? '';
  if (!app.allowedOrigins.includes(parentOrigin)) {
    return new Response('This site is not allowed to embed the key widget', { status: 403 });
  }
  const nonce = createNonce();
  const protection = readProtection(dependencies);
  const { appID, name: appName } = app;
  const page = renderWidgetPage({ appID, appName, parentOrigin, nonce, protection });
  return new Response(page, { headers: buildWidgetSecurityHeaders(nonce, parentOrigin) });
}

export function serveWidgetFont() {
  return new Response(WIDGET_FONT, {
    headers: {
      'content-type': 'font/woff2',
      'cache-control': 'public, max-age=31536000, immutable',
      'x-content-type-options': 'nosniff'
    }
  });
}
