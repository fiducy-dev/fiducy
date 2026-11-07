import { buildWidgetScript } from './script';
import { WIDGET_STYLES } from './styles';

import type { WidgetPageInput, WidgetProtection } from '../types';

const PROTECTION_BADGES: Record<WidgetProtection, string> = {
  enclave: `<span class="inline-flex items-center gap-1.5 border border-border px-1.5 py-0.5 text-xs text-muted-foreground"><span class="size-1.5 bg-ink"></span>Sealed in an enclave</span>`,
  test: `<span class="inline-flex items-center gap-1.5 border border-dashed border-ink px-1.5 py-0.5 text-xs font-medium text-ink"><span class="size-1.5 border border-ink"></span>Test gateway</span>`,
  unattested: `<span class="inline-flex items-center gap-1.5 border border-dashed border-ink px-1.5 py-0.5 text-xs font-medium text-ink"><span class="size-1.5 border border-ink"></span>No enclave</span>`
};

function escapeHTML(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function describeProtection(protection: WidgetProtection, appName: string): string {
  if (protection === 'test') {
    return 'This is a test gateway without an enclave. Enter a made-up key, not a real one.';
  }
  if (protection === 'unattested') {
    return `${appName} never sees your key, but this gateway is not running in an enclave, your keys are not secure.`;
  }
  return `${appName} never sees your key. It is sealed and only opened to call your AI provider.`;
}

export function renderWidgetPage(input: WidgetPageInput): string {
  const { appID, appName, parentOrigin, nonce, protection } = input;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Connect your API key</title>
<style nonce="${nonce}">${WIDGET_STYLES}</style>
</head>
<body class="m-0 bg-white p-4 font-sans text-sm leading-[1.55] text-ink antialiased selection:bg-ink selection:text-white">
<form id="key-form" class="grid grid-cols-[minmax(0,1fr)] gap-2.5" autocomplete="off">
  <div class="flex flex-wrap items-baseline justify-between gap-2">
    <label for="api-key" class="text-[15px] font-semibold tracking-[-0.01em]">Your API key</label>
    ${PROTECTION_BADGES[protection]}
  </div>
  <div class="flex gap-2">
    <div class="flex min-w-0 flex-1 items-center border border-input bg-white shadow-xs/5 transition-shadow focus-within:border-ink focus-within:ring-2 focus-within:ring-ink/10">
      <input id="api-key" name="api-key" type="password" spellcheck="false" autocapitalize="off" placeholder="sk-..." required class="h-9 min-w-0 flex-1 border-0 bg-transparent px-3 font-mono text-[13px] [font-variant-ligatures:none] outline-none placeholder:text-muted-foreground">
      <button id="toggle-button" type="button" aria-controls="api-key" aria-pressed="false" class="mr-1 h-7 cursor-pointer px-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-ink focus-visible:ring-2 focus-visible:ring-ink">Show</button>
    </div>
    <button id="save-button" type="submit" class="inline-flex h-9 shrink-0 cursor-pointer items-center border border-primary bg-primary px-3 font-medium text-white shadow-xs hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-1 disabled:cursor-wait disabled:opacity-64">Save key</button>
  </div>
  <p id="protection" class="${protection === 'enclave' ? 'm-0 text-xs font-light text-muted-foreground' : 'm-0 text-xs text-ink'}">${escapeHTML(describeProtection(protection, appName))}</p>
  <p id="status" class="m-0 min-h-[1.55em] text-[13px] data-[state=error]:text-destructive" role="status"></p>
</form>
<div id="saved" class="grid grid-cols-[minmax(0,1fr)] animate-settle gap-2.5 motion-reduce:animate-none" hidden>
  <div class="flex flex-wrap items-baseline justify-between gap-2">
    <p class="m-0 text-[15px] font-semibold tracking-[-0.01em]">Key saved and encrypted.</p>
    <span id="key-hint" class="font-mono text-xs text-muted-foreground"></span>
  </div>
  <p class="m-0 text-xs font-light text-muted-foreground">${escapeHTML(appName)} now holds a handle, not your key. You can revoke it at any time.</p>
</div>
<p class="mt-3.5 mb-0 border-t border-dashed border-border pt-2.5 text-[11px] text-muted-foreground">Secured by Fiducy</p>
<script nonce="${nonce}">${buildWidgetScript(appID, parentOrigin)}</script>
</body>
</html>`;
}

export function buildWidgetSecurityHeaders(nonce: string, parentOrigin: string): Headers {
  const contentSecurityPolicy = [
    "default-src 'none'",
    `script-src 'nonce-${nonce}'`,
    `style-src 'nonce-${nonce}'`,
    "font-src 'self'",
    "connect-src 'self'",
    `frame-ancestors ${parentOrigin}`,
    "base-uri 'none'",
    "form-action 'none'"
  ].join('; ');
  return new Headers({
    'content-type': 'text/html; charset=utf-8',
    'content-security-policy': contentSecurityPolicy,
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'cache-control': 'no-store'
  });
}
