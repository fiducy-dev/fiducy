import type { GatewayProvider, UserKeySummaryView } from '@fiducy/sdk/react';

export interface ConnectKeyArgs extends Record<string, unknown> {
  provider: GatewayProvider;
}

export interface ConnectKeyResult {
  connected: boolean;
  provider: GatewayProvider;
  keyID?: string;
}

export interface FiducyToolkitOptions {
  /** Optional: by default the key box reads these from your Fiducy route. */
  gatewayURL?: string;
  appID?: string;
  /** Where the app mounted its Fiducy handler. Defaults to /api/fiducy. */
  basePath?: string;
  /** Runs after a key is saved, for example to refresh a keys list. */
  onConnected?: (key: UserKeySummaryView) => void;
}

export interface KeyRequestOptions {
  provider: GatewayProvider;
  /** Shown above the widget. Defaults to a line naming the provider. */
  message?: string;
}
