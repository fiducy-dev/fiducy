import { describe, expect, test } from 'bun:test';

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
