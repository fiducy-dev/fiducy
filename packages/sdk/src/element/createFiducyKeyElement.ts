import { mountKeyWidget } from '@fiducy/widget';

import { DEFAULT_BASE_PATH, PROVIDER_LABELS } from '../constants.ts';
import { FIDUCY_KEYS_CHANGED, fetchBrowserConfig, findProviderKey } from '../keysApi.ts';
import { removeConnectedKey, saveConnectedKey } from '../keysApi.ts';
import { FIDUCY_KEY_ATTRIBUTES, FIDUCY_KEY_EVENTS } from './constants.ts';
import { createActionButton, createElementWithPart, readProviderLabel } from './render.ts';
import { renderError, renderStatus } from './render.ts';
import { FIDUCY_KEY_STYLES } from './styles.ts';

import type { MountedKeyWidget, WidgetSealedRecord } from '@fiducy/widget';
import type { FiducyBrowserConfig, FiducyKeyState, GatewayProvider } from '../types.ts';
import type { KeysChangedDetail, UserKeySummaryView } from '../types.ts';

function normalizeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isGatewayProvider(value: string | null): value is GatewayProvider {
  return value !== null && Object.hasOwn(PROVIDER_LABELS, value);
}

export function createFiducyKeyElement(): CustomElementConstructor {
  return class FiducyKeyElement extends HTMLElement {
    static observedAttributes = FIDUCY_KEY_ATTRIBUTES;
    #root = this.attachShadow({ mode: 'open' });
    #widget: MountedKeyWidget | null = null;
    #loadCount = 0;
    #isRefreshScheduled = false;

    #handleKeysChanged = (event: Event) => {
      const detail = (event as CustomEvent<KeysChangedDetail>).detail;
      if (detail?.source !== this && detail?.basePath === this.basePath) this.#scheduleRefresh();
    };

    get basePath(): string {
      return (this.getAttribute('base-path') ?? DEFAULT_BASE_PATH).replace(/\/+$/, '');
    }

    get state(): FiducyKeyState {
      return (this.getAttribute('state') as FiducyKeyState | null) ?? 'loading';
    }

    connectedCallback() {
      window.addEventListener(FIDUCY_KEYS_CHANGED, this.#handleKeysChanged);
      this.#scheduleRefresh();
    }

    disconnectedCallback() {
      window.removeEventListener(FIDUCY_KEYS_CHANGED, this.#handleKeysChanged);
      this.#loadCount += 1;
      this.#replaceContent([]);
    }

    attributeChangedCallback(_name: string, previous: string | null, next: string | null) {
      if (this.isConnected && previous !== next) this.#scheduleRefresh();
    }

    #scheduleRefresh() {
      if (this.#isRefreshScheduled) return;
      this.#isRefreshScheduled = true;
      queueMicrotask(() => {
        this.#isRefreshScheduled = false;
        if (this.isConnected) this.refresh();
      });
    }

    async refresh() {
      const loadNumber = ++this.#loadCount;
      this.#show('loading', []);
      try {
        const provider = this.#readProvider();
        const [config, lookup] = await Promise.all([
          this.#readConfig(),
          findProviderKey(provider, this.basePath)
        ]);
        if (loadNumber !== this.#loadCount) return;
        if (lookup.state === 'signed-out') return this.#showSignedOut(provider);
        if (lookup.key) return this.#showConnected(provider, config, lookup.key);
        this.#showConnect(provider, config, null);
      } catch (error) {
        if (loadNumber === this.#loadCount) this.#showFailure(normalizeError(error));
      }
    }

    #readProvider(): GatewayProvider {
      const provider = this.getAttribute('provider');
      if (isGatewayProvider(provider)) return provider;
      const options = Object.keys(PROVIDER_LABELS).join(', ');
      throw new Error(`Set provider on <fiducy-key> to one of: ${options}.`);
    }

    async #readConfig(): Promise<FiducyBrowserConfig> {
      const gatewayURL = this.getAttribute('gateway-url');
      const appID = this.getAttribute('app-id');
      if (!gatewayURL || !appID) return fetchBrowserConfig(this.basePath);
      const enclavePCR0 = this.getAttribute('enclave-pcr0');
      const enclavePCR16 = this.getAttribute('enclave-pcr16');
      const skipAttestation = this.hasAttribute('skip-attestation');
      return { gatewayURL, appID, enclavePCR0, enclavePCR16, skipAttestation };
    }

    #showSignedOut(provider: GatewayProvider) {
      const label = readProviderLabel(provider);
      this.#show('signed-out', [renderStatus(`Sign in to connect your ${label} key.`)]);
    }

    #showConnected(
      provider: GatewayProvider,
      config: FiducyBrowserConfig,
      key: UserKeySummaryView
    ) {
      const replaceButton = createActionButton('Replace', () =>
        this.#showConnect(provider, config, key)
      );
      const removeButton = createActionButton('Remove', () =>
        this.#remove(key, [replaceButton, removeButton])
      );
      const message = `${readProviderLabel(provider)} key connected`;
      this.#show('connected', [renderStatus(message, [replaceButton, removeButton])]);
    }

    #showConnect(
      provider: GatewayProvider,
      config: FiducyBrowserConfig,
      previous: UserKeySummaryView | null
    ) {
      const frame = createElementWithPart('div', 'frame');
      const content: HTMLElement[] = [frame];
      if (previous) {
        const cancelButton = createActionButton('Keep current key', () =>
          this.#showConnected(provider, config, previous)
        );
        content.unshift(
          renderStatus('Paste a new key to replace the current one.', [cancelButton])
        );
      }
      this.#show('connect', content);
      this.#widget = mountKeyWidget({
        ...config,
        container: frame,
        onHandle: (handle, record) => this.#save(provider, config, handle, record),
        onError: (message) => this.#emit(FIDUCY_KEY_EVENTS.error, { message }),
        onRefused: (message) => this.#showFailure(message)
      });
    }

    async #save(
      provider: GatewayProvider,
      config: FiducyBrowserConfig,
      handle: string,
      record: WidgetSealedRecord | undefined
    ) {
      try {
        const key = await saveConnectedKey({ provider, handle, record }, this.basePath, this);
        this.#showConnected(provider, config, key);
        this.#emit(FIDUCY_KEY_EVENTS.connected, key);
      } catch (error) {
        this.#showFailure(normalizeError(error));
      }
    }

    async #remove(key: UserKeySummaryView, buttons: HTMLButtonElement[]) {
      for (const button of buttons) button.disabled = true;
      try {
        await removeConnectedKey(key.keyID, this.basePath, this);
        this.#emit(FIDUCY_KEY_EVENTS.removed, { keyID: key.keyID });
        await this.refresh();
      } catch (error) {
        this.#showFailure(normalizeError(error));
      }
    }

    #showFailure(message: string) {
      this.#show('error', [renderError(message)]);
      this.#emit(FIDUCY_KEY_EVENTS.error, { message });
    }

    #emit(type: string, detail: unknown) {
      this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
    }

    #show(state: FiducyKeyState, content: HTMLElement[]) {
      this.setAttribute('state', state);
      this.#replaceContent(content);
    }

    #replaceContent(content: HTMLElement[]) {
      this.#widget?.unmount();
      this.#widget = null;
      const style = document.createElement('style');
      style.textContent = FIDUCY_KEY_STYLES;
      this.#root.replaceChildren(style, ...content);
    }
  };
}
