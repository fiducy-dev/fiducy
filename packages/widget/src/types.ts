export interface WidgetSealedRecord {
  keyID: string;
  appID: string;
  ciphertext: string;
  iv: string;
  wrappedShareB: string;
}

export interface MountKeyWidgetOptions {
  gatewayURL: string;
  appID: string;
  container: HTMLElement;
  onHandle: (handle: string, record?: WidgetSealedRecord) => void;
  onError?: (message: string) => void;
  onRefused?: (message: string) => void;
  enclavePCR0?: string | null;
  enclavePCR16?: string | null;
  skipAttestation?: boolean;
}

export interface MountedKeyWidget {
  iframe: HTMLIFrameElement;
  unmount: () => void;
}

export type WidgetMessage =
  | { type: 'fiducy:ready' }
  | { type: 'fiducy:handle'; handle: string; record?: WidgetSealedRecord }
  | { type: 'fiducy:error'; message: string };
