import { FiducyKey } from '@fiducy/sdk/react';
import { useState } from 'react';

import { PROVIDER_LABELS } from './constants.ts';

import type { ToolCallMessagePartProps } from '@assistant-ui/react';
import type { ConnectKeyArgs, ConnectKeyResult, FiducyToolkitOptions } from './types.ts';

type ConnectKeyToolUIProps = ToolCallMessagePartProps<ConnectKeyArgs, ConnectKeyResult> &
  FiducyToolkitOptions;

/**
 * Renders the Fiducy key box inside the thread. The box is an iframe served by the gateway,
 * so the key goes from the user's keyboard to the enclave and the app only gets a handle.
 */
export function ConnectKeyToolUI({
  args,
  result,
  addResult,
  gatewayURL,
  appID,
  basePath,
  onConnected
}: ConnectKeyToolUIProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const label = PROVIDER_LABELS[args.provider] ?? args.provider;

  if (result) {
    return (
      <p className="fiducy-tool fiducy-tool-done" data-state="connected">
        {label} key connected
      </p>
    );
  }
  return (
    <div className="fiducy-tool" data-state="waiting">
      <p className="fiducy-tool-title">Connect your {label} key</p>
      <FiducyKey
        gatewayURL={gatewayURL}
        appID={appID}
        provider={args.provider}
        basePath={basePath}
        className="fiducy-tool-widget"
        onError={setErrorMessage}
        onConnected={(key) => {
          onConnected?.(key);
          addResult({ connected: true, provider: key.provider, keyID: key.keyID });
        }}
      />
      {errorMessage && <p className="fiducy-tool-error">{errorMessage}</p>}
    </div>
  );
}
