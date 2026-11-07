import { PROVIDER_LABELS } from '../constants.ts';

import type { GatewayProvider } from '../types.ts';

export function readProviderLabel(provider: GatewayProvider | null): string {
  return provider ? PROVIDER_LABELS[provider] : 'API';
}

export function createElementWithPart(tag: string, part: string, text = ''): HTMLElement {
  const element = document.createElement(tag);
  element.setAttribute('part', part);
  element.textContent = text;
  return element;
}

export function createActionButton(label: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('part', 'button');
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

export function renderStatus(message: string, buttons: HTMLButtonElement[] = []): HTMLElement {
  const status = createElementWithPart('div', 'status');
  status.setAttribute('role', 'status');
  status.append(createElementWithPart('p', 'message', message));
  if (buttons.length === 0) return status;
  const actions = createElementWithPart('span', 'actions');
  actions.append(...buttons);
  status.append(actions);
  return status;
}

export function renderError(message: string): HTMLElement {
  const error = createElementWithPart('p', 'error', message);
  error.setAttribute('role', 'alert');
  return error;
}
