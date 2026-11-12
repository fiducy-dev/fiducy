import { resolve } from 'node:path';

export const SOURCE_DIRECTORY = resolve(import.meta.dir, '../../src');

export const PAGE_SCRIPTS: Record<string, string> = {
  element: `import '${SOURCE_DIRECTORY}/element.ts';
const element = document.createElement('fiducy-key');
const basePath = new URLSearchParams(location.search).get('basePath');
const provider = new URLSearchParams(location.search).get('provider') ?? 'openai';
if (provider !== 'none') element.setAttribute('provider', provider);
if (basePath) element.setAttribute('base-path', basePath);
for (const [parameter, attribute] of [['gatewayURL', 'gateway-url'], ['appID', 'app-id'], ['enclavePCR0', 'enclave-pcr0'], ['enclavePCR16', 'enclave-pcr16']]) {
  const value = new URLSearchParams(location.search).get(parameter);
  if (value) element.setAttribute(attribute, value);
}
for (const type of ['fiducy:connected', 'fiducy:removed', 'fiducy:error']) {
  element.addEventListener(type, (event) => window.recordEvent(type, event.detail));
}
document.getElementById('slot').append(element);`,
  react: `import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { FiducyKey } from '${SOURCE_DIRECTORY}/react.ts';
createRoot(document.getElementById('slot')).render(createElement(FiducyKey, {
  provider: 'openai',
  onConnected: (key) => window.recordEvent('connected', key),
  onRemoved: (keyID) => window.recordEvent('removed', keyID)
}));`,
  vue: `import { createApp, h } from 'vue';
import { FiducyKey } from '${SOURCE_DIRECTORY}/vue.ts';
createApp({ render: () => h(FiducyKey, {
  provider: 'openai',
  onConnected: (key) => window.recordEvent('connected', key),
  onRemoved: (keyID) => window.recordEvent('removed', keyID)
}) }).mount('#slot');`,
  solid: `import { render } from 'solid-js/web';
import { FiducyKey } from '${SOURCE_DIRECTORY}/solid.ts';
render(() => FiducyKey({
  provider: 'openai',
  onConnected: (key) => window.recordEvent('connected', key),
  onRemoved: (keyID) => window.recordEvent('removed', keyID)
}), document.getElementById('slot'));`,
  svelte: `import { fiducyKey } from '${SOURCE_DIRECTORY}/svelte.ts';
fiducyKey(document.getElementById('slot'), {
  provider: 'openai',
  onConnected: (key) => window.recordEvent('connected', key),
  onRemoved: (keyID) => window.recordEvent('removed', keyID)
});`
};
