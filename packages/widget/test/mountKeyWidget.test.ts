import { describe, expect, spyOn, test } from 'bun:test';

import { mountKeyWidget } from '../src/mountKeyWidget.ts';

const baseOptions = {
  gatewayURL: 'http://localhost:3438',
  appID: 'app_test',
  container: {} as HTMLElement,
  onHandle: () => {}
};

describe('mountKeyWidget options', () => {
  test('names the missing gateway URL', () => {
    expect(() =>
      mountKeyWidget({ ...baseOptions, gatewayURL: undefined as unknown as string })
    ).toThrow('Fiducy: gatewayURL is missing');
  });

  test('rejects a gateway URL without a scheme', () => {
    expect(() => mountKeyWidget({ ...baseOptions, gatewayURL: 'gateway.yourapp.com' })).toThrow(
      'is not a valid URL'
    );
  });

  test('names the missing app ID', () => {
    expect(() => mountKeyWidget({ ...baseOptions, appID: '' })).toThrow('Fiducy: appID is missing');
  });
});

interface FakeContainer {
  children: unknown[];
  appendChild: (child: unknown) => void;
}

function installFakeBrowser(): () => void {
  const globals = globalThis as Record<string, unknown>;
  const saved = { document: globals.document, window: globals.window };
  globals.document = { createElement: () => ({ style: {}, remove: () => {} }) };
  globals.window = {
    location: { origin: 'https://notesapp.dev' },
    addEventListener: () => {},
    removeEventListener: () => {}
  };
  return () => Object.assign(globals, saved);
}

function mountRemote(extra: Record<string, unknown>) {
  const container: FakeContainer = {
    children: [],
    appendChild: (child) => container.children.push(child)
  };
  return new Promise<{ container: FakeContainer; refusal: string | null }>((resolve) => {
    mountKeyWidget({
      ...baseOptions,
      gatewayURL: 'https://gateway.notesapp.dev',
      container: container as unknown as HTMLElement,
      onRefused: (refusal) => resolve({ container, refusal }),
      ...extra
    });
    setTimeout(() => resolve({ container, refusal: null }), 200);
  });
}

describe('mountKeyWidget gateway check', () => {
  test('leaves the container empty and reports why when the gateway is refused', async () => {
    const restore = installFakeBrowser();
    try {
      const { container, refusal } = await mountRemote({});
      expect(refusal).toContain('Fiducy will not send keys');
      expect(container.children).toEqual([]);
    } finally {
      restore();
    }
  });

  test('stays closed when the check throws an error with an empty message', async () => {
    const restore = installFakeBrowser();
    const getRandomValues = spyOn(crypto, 'getRandomValues').mockImplementation(() => {
      throw new DOMException('', 'OperationError');
    });
    try {
      const pcrs = { enclavePCR0: 'ab'.repeat(48), enclavePCR16: '11'.repeat(48) };
      const { container, refusal } = await mountRemote(pcrs);
      expect(refusal).toContain('OperationError');
      expect(container.children).toEqual([]);
    } finally {
      getRandomValues.mockRestore();
      restore();
    }
  });

  test('mounts the key box for a local gateway with no PCRs', async () => {
    const restore = installFakeBrowser();
    try {
      const { container, refusal } = await mountRemote({ gatewayURL: 'http://localhost:3438' });
      expect(refusal).toBeNull();
      expect(container.children).toHaveLength(1);
    } finally {
      restore();
    }
  });
});
