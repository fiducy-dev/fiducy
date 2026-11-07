import { KEY_UNAVAILABLE_ERROR, fail, openSecret, parseHandle, succeed } from '@fiducy/core';

import { KEY_HANDLE_HEADER, KEY_RECORD_HEADER } from './constants';
import { describeFailure } from './responses';
import { parseRecordHeader } from './validators';

import type { OpenSecretError, SealedRecord } from '@fiducy/core';
import type { GatewayDependencies, GatewayFailure, GatewayResult } from './types';
import type { RegisteredApp, ResolvedKey } from './types';

function describeOpenFailure(error: OpenSecretError): GatewayFailure {
  if (error === 'invalid_handle') return describeFailure(400, 'The key handle is malformed');
  if (error === 'app_mismatch') return describeFailure(403, 'This key belongs to another app');
  return describeFailure(403, 'This handle cannot open its key');
}

async function findRecord(
  app: RegisteredApp,
  headers: Headers,
  keyID: string,
  keyStore: GatewayDependencies['keyStore']
): Promise<GatewayResult<SealedRecord>> {
  if (app.recordStorage === 'app') {
    const header = headers.get(KEY_RECORD_HEADER)?.trim();
    if (!header)
      return fail(describeFailure(400, `Send the stored key record in ${KEY_RECORD_HEADER}`));
    return parseRecordHeader(header);
  }
  const record = await keyStore.findRecord(keyID);
  if (!record)
    return fail(
      describeFailure(
        404,
        'No key found for this handle. It may have been revoked',
        KEY_UNAVAILABLE_ERROR
      )
    );
  return succeed(record);
}

export async function resolveApiKey(
  app: RegisteredApp,
  headers: Headers,
  { keyStore, keyWrapper }: GatewayDependencies
): Promise<GatewayResult<ResolvedKey>> {
  const handle = headers.get(KEY_HANDLE_HEADER)?.trim();
  if (!handle)
    return fail(describeFailure(400, `Send the user's key handle in ${KEY_HANDLE_HEADER}`));
  const parsedHandle = parseHandle(handle);
  if (!parsedHandle.ok) return fail(describeOpenFailure(parsedHandle.error));
  if (app.revokedKeyIDs?.includes(parsedHandle.value.keyID)) {
    return fail(describeFailure(403, 'This key was revoked by the app', KEY_UNAVAILABLE_ERROR));
  }

  const found = await findRecord(app, headers, parsedHandle.value.keyID, keyStore);
  if (!found.ok) return found;
  const record = found.value;

  const opened = await openSecret({ appID: app.appID, handle, record, keyWrapper });
  if (!opened.ok) return fail(describeOpenFailure(opened.error));
  return succeed({ apiKey: opened.value, record });
}

export async function enforceRequestLimit(
  app: RegisteredApp,
  keyID: string,
  { usageLedger }: GatewayDependencies
): Promise<GatewayResult<number>> {
  const requestCount = await usageLedger.countRequestsThisMonth(keyID);
  if (requestCount >= app.monthlyRequestLimitPerKey) {
    return fail(describeFailure(429, 'This key reached its monthly request limit'));
  }
  return succeed(requestCount);
}
