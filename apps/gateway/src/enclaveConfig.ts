import { createHash } from 'node:crypto';

import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { FetchHttpHandler } from '@smithy/fetch-http-handler';

import { ENCLAVE_CONFIG_FIELDS, ENCLAVE_CONFIG_PCR_INDEX, PCR_LENGTH_BYTES } from './constants';
import { readInstanceRegion, readInstanceRoleCredentials } from './instanceMetadata';
import { extendAndLockPCR } from './nsm';

import type { EnclaveConfig, EnclaveConfigMeasurement, ParameterSender } from './types';

function sha384(...parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const hash = createHash('sha384');
  for (const part of parts) hash.update(part);
  return new Uint8Array(hash.digest());
}

export function parseEnclaveConfig(raw: string): EnclaveConfig {
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
    throw new Error('The enclave config must be a JSON object');
  const entries = Object.entries(parsed);
  const expected = new Set<string>(ENCLAVE_CONFIG_FIELDS);
  const unknownField = entries.find(([field]) => !expected.has(field));
  if (unknownField) throw new Error(`The enclave config has an unknown field ${unknownField[0]}`);
  const missingField = ENCLAVE_CONFIG_FIELDS.find((field) => {
    const value = (parsed as Record<string, unknown>)[field];
    return typeof value !== 'string' || value.length === 0;
  });
  if (missingField) throw new Error(`The enclave config needs ${missingField}`);
  return parsed as EnclaveConfig;
}

export function measureEnclaveConfig(raw: string): EnclaveConfigMeasurement {
  const digest = sha384(new TextEncoder().encode(raw));
  return { digest, expectedPCR: sha384(new Uint8Array(PCR_LENGTH_BYTES), digest) };
}

export async function fetchEnclaveConfig(client: ParameterSender, name: string): Promise<string> {
  const output = await client.send(new GetParameterCommand({ Name: name }));
  const value = output.Parameter?.Value;
  if (!value) throw new Error(`Parameter ${name} holds no enclave config`);
  return value;
}

function applyEnclaveConfig(config: EnclaveConfig): void {
  process.env.AWS_REGION = config.region;
  process.env.FIDUCY_KMS_KEY_ID = config.kmsKeyID;
  process.env.FIDUCY_KEYS_TABLE = config.keysTable;
  process.env.FIDUCY_CONTROL_PLANE_URL = config.controlPlaneURL;
  process.env.FIDUCY_GATEWAY_TOKEN_CIPHERTEXT = config.gatewayTokenCiphertext;
  process.env.FIDUCY_PUBLIC_HOST = config.publicHost;
}

async function createParameterClient(): Promise<ParameterSender> {
  const region = await readInstanceRegion();
  return new SSMClient({
    region,
    credentials: readInstanceRoleCredentials,
    requestHandler: new FetchHttpHandler()
  });
}

export async function loadEnclaveConfig(): Promise<void> {
  const parameterName = process.env.FIDUCY_ENCLAVE_CONFIG_PARAMETER;
  if (!parameterName) return;
  const raw = await fetchEnclaveConfig(await createParameterClient(), parameterName);
  const config = parseEnclaveConfig(raw);
  const { digest, expectedPCR } = measureEnclaveConfig(raw);
  extendAndLockPCR(ENCLAVE_CONFIG_PCR_INDEX, digest, expectedPCR);
  applyEnclaveConfig(config);
  const measured = Buffer.from(expectedPCR).toString('hex');
  console.log(`Loaded the enclave config; PCR${ENCLAVE_CONFIG_PCR_INDEX} is ${measured}`);
}
