import { afterAll, describe, expect, it } from 'bun:test';

import { DeleteItemCommand, type GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { DecryptCommand, EncryptCommand } from '@aws-sdk/client-kms';
import { openSecret, sealSecret } from '@fiducy/core';
import { createProviderRegistry } from '@fiducy/providers';

import { createDynamoKeyStore } from '../src/dynamoKeyStore';
import { createKmsKeyWrapper, decryptBootSecret } from '../src/kmsKeyWrapper';
import { createMemoryAppDirectory, createMemoryUsageLedger } from '../src/memoryStores';
import { createMemoryKeyStore } from '../src/memoryStores';
import { createGateway } from '../src/router';
import { CHAT_APP } from './harness';

import type { AttributeValue } from '@aws-sdk/client-dynamodb';
import type { DynamoSender, KmsOutput, KmsSender } from '../src/types';

const KEY_ID = 'arn:aws:kms:us-east-1:111122223333:key/test';

function createFakeKms() {
  let attested = true;
  const sealed = new Map<string, { plaintext: Uint8Array; context: string }>();
  const client: KmsSender = {
    send: async (command): Promise<KmsOutput> => {
      const context = JSON.stringify(command.input.EncryptionContext);
      if (command instanceof EncryptCommand) {
        const blob = crypto.getRandomValues(new Uint8Array(24));
        sealed.set(Buffer.from(blob).toString('hex'), {
          plaintext: new Uint8Array(command.input.Plaintext ?? []),
          context
        });
        return { CiphertextBlob: blob };
      }
      if (!(command instanceof DecryptCommand) || !attested) throw new Error('AccessDenied');
      const entry = sealed.get(Buffer.from(command.input.CiphertextBlob ?? []).toString('hex'));
      if (!entry || entry.context !== context) throw new Error('InvalidCiphertextException');
      return { Plaintext: entry.plaintext };
    }
  };
  return {
    client,
    sealed,
    refuseAttestation: () => {
      attested = false;
    }
  };
}

describe('wrapping share B with KMS', () => {
  it('seals and opens a key through KMS, bound to the app', async () => {
    const kms = createFakeKms();
    const keyWrapper = createKmsKeyWrapper({ client: kms.client, keyID: KEY_ID });
    const { handle, record } = await sealSecret({
      appID: 'app_one',
      apiKey: 'sk-live',
      keyWrapper
    });
    const opened = await openSecret({ appID: 'app_one', handle, record, keyWrapper });
    expect(opened).toEqual({ ok: true, value: 'sk-live' });
    const otherApp = await keyWrapper.unwrap(
      'app_two',
      Buffer.from(record.wrappedShareB, 'base64url')
    );
    expect(otherApp.ok).toBe(false);
  });

  it('cannot open a key when KMS refuses the attestation', async () => {
    const kms = createFakeKms();
    const keyWrapper = createKmsKeyWrapper({ client: kms.client, keyID: KEY_ID });
    const { handle, record } = await sealSecret({
      appID: 'app_one',
      apiKey: 'sk-live',
      keyWrapper
    });
    kms.refuseAttestation();
    const opened = await openSecret({ appID: 'app_one', handle, record, keyWrapper });
    expect(opened).toEqual({ ok: false, error: 'unwrap_failed' });
  });

  it('decrypts a boot secret only with its purpose', async () => {
    const kms = createFakeKms();
    const { CiphertextBlob } = await kms.client.send(
      new EncryptCommand({
        KeyId: KEY_ID,
        Plaintext: new TextEncoder().encode('token_123'),
        EncryptionContext: { fiducyPurpose: 'gateway-token' }
      })
    );
    const ciphertext = Buffer.from(CiphertextBlob ?? []).toString('base64');
    expect(await decryptBootSecret(kms.client, KEY_ID, ciphertext, 'gateway-token')).toBe(
      'token_123'
    );
    expect(decryptBootSecret(kms.client, KEY_ID, ciphertext, 'other')).rejects.toThrow();
  });
});

function createFakeDynamo() {
  const items = new Map<string, Record<string, AttributeValue>>();
  const requests: Array<{ tableName?: string; condition?: string }> = [];
  const keyOf = (key: Record<string, AttributeValue> | undefined) => key?.keyID?.S ?? '';
  const send = async (command: GetItemCommand | PutItemCommand | DeleteItemCommand) => {
    requests.push({
      tableName: command.input.TableName,
      condition:
        'ConditionExpression' in command.input ? command.input.ConditionExpression : undefined
    });
    if (command instanceof PutItemCommand) {
      const keyID = keyOf(command.input.Item);
      if (items.has(keyID)) throw new Error('ConditionalCheckFailedException');
      items.set(keyID, command.input.Item ?? {});
      return {};
    }
    const keyID = keyOf(command.input.Key);
    const item = items.get(keyID);
    if (command instanceof DeleteItemCommand) {
      items.delete(keyID);
      return { Attributes: item };
    }
    return { Item: item };
  };
  return { client: { send } as unknown as DynamoSender, items, requests };
}

describe('keeping sealed records in DynamoDB', () => {
  const record = {
    keyID: 'AAAAAAAAAAAAAAAAAAAAAA',
    appID: 'app_one',
    ciphertext: 'abc',
    iv: 'def',
    wrappedShareB: 'ghi'
  };

  it('saves, finds and deletes a record in its table', async () => {
    const dynamo = createFakeDynamo();
    const store = createDynamoKeyStore({ client: dynamo.client, tableName: 'fiducy-keys' });
    await store.saveRecord(record);
    expect(await store.findRecord(record.keyID)).toEqual(record);
    expect(await store.deleteRecord(record.keyID)).toBe(true);
    expect(await store.findRecord(record.keyID)).toBeNull();
    expect(await store.deleteRecord(record.keyID)).toBe(false);
    expect(dynamo.requests.every((request) => request.tableName === 'fiducy-keys')).toBe(true);
  });

  it('never overwrites an existing record', async () => {
    const dynamo = createFakeDynamo();
    const store = createDynamoKeyStore({ client: dynamo.client, tableName: 'fiducy-keys' });
    await store.saveRecord(record);
    await expect(store.saveRecord({ ...record, ciphertext: 'replaced' })).rejects.toThrow();
    expect(await store.findRecord(record.keyID)).toEqual(record);
    expect(dynamo.requests[0]?.condition).toBe('attribute_not_exists(keyID)');
  });

  it('treats an item with missing fields as no record', async () => {
    const dynamo = createFakeDynamo();
    dynamo.items.set(record.keyID, { keyID: { S: record.keyID } });
    const store = createDynamoKeyStore({ client: dynamo.client, tableName: 'fiducy-keys' });
    expect(await store.findRecord(record.keyID)).toBeNull();
  });
});

describe('serving attestation documents', () => {
  const createTestGateway = async (attest?: (nonce: Uint8Array | null) => Promise<Uint8Array>) =>
    createGateway({
      keyWrapper: createKmsKeyWrapper({ client: createFakeKms().client, keyID: KEY_ID }),
      keyStore: createMemoryKeyStore(),
      appDirectory: await createMemoryAppDirectory([CHAT_APP]),
      usageLedger: createMemoryUsageLedger(),
      providerRegistry: createProviderRegistry(),
      attest
    });

  it('returns the document with the caller nonce', async () => {
    const gateway = await createTestGateway(async (nonce) =>
      new TextEncoder().encode(`doc:${new TextDecoder().decode(nonce ?? new Uint8Array())}`)
    );
    const response = await gateway(new Request('http://gateway/attestation?nonce=n123'));
    const body = (await response.json()) as { data: { document: string } };
    expect(response.status).toBe(200);
    expect(Buffer.from(body.data.document, 'base64').toString()).toBe('doc:n123');
  });

  it('lets any page read the document, so the widget can check it in the browser', async () => {
    const gateway = await createTestGateway(async () => new Uint8Array([1]));
    const response = await gateway(new Request('http://gateway/attestation?nonce=n123'));
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('says so when it is not in an enclave', async () => {
    const gateway = await createTestGateway();
    const response = await gateway(new Request('http://gateway/attestation'));
    expect(response.status).toBe(404);
  });
});
