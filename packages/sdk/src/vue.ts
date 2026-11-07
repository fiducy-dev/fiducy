import { defineComponent, h, onBeforeUnmount, onMounted, ref } from 'vue';

import { FIDUCY_KEY_TAG } from './element/constants.ts';
import { defineFiducyKey } from './element/defineFiducyKey.ts';
import { attachFiducyKeyListeners, toElementAttributes } from './element/listeners.ts';

import type { PropType } from 'vue';
import type { GatewayProvider, UserKeySummaryView } from './types.ts';

export const FiducyKey = defineComponent({
  name: 'FiducyKey',
  props: {
    provider: { type: String as PropType<GatewayProvider>, required: true },
    basePath: { type: String, default: undefined },
    gatewayURL: { type: String, default: undefined },
    appID: { type: String, default: undefined }
  },
  emits: {
    connected: (_key: UserKeySummaryView) => true,
    removed: (_keyID: string) => true,
    error: (_message: string) => true
  },
  setup: (props, { emit }) => {
    const elementRef = ref<HTMLElement | null>(null);
    let detachListeners: (() => void) | null = null;
    onMounted(() => {
      defineFiducyKey();
      if (!elementRef.value) return;
      detachListeners = attachFiducyKeyListeners(elementRef.value, () => ({
        onConnected: (key) => emit('connected', key),
        onRemoved: (keyID) => emit('removed', keyID),
        onError: (message) => emit('error', message)
      }));
    });
    onBeforeUnmount(() => detachListeners?.());
    return () => h(FIDUCY_KEY_TAG, { ref: elementRef, ...toElementAttributes(props) });
  }
});

export type { GatewayProvider, UserKeySummaryView } from './types.ts';
