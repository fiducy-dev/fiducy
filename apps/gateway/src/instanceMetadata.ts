import { IMDS_REGION_PATH, IMDS_ROLE_PATH, IMDS_TOKEN_PATH } from './constants';
import { IMDS_TOKEN_TTL_SECONDS, IMDS_URL } from './constants';

import type { InstanceRoleCredentials } from './types';

async function requestMetadataToken(): Promise<string> {
  const response = await fetch(`${IMDS_URL}${IMDS_TOKEN_PATH}`, {
    method: 'PUT',
    headers: { 'x-aws-ec2-metadata-token-ttl-seconds': String(IMDS_TOKEN_TTL_SECONDS) }
  });
  if (!response.ok) throw new Error(`Instance metadata refused a token: ${response.status}`);
  return response.text();
}

async function readMetadata(path: string, token: string): Promise<string> {
  const response = await fetch(`${IMDS_URL}${path}`, {
    headers: { 'x-aws-ec2-metadata-token': token }
  });
  if (!response.ok) throw new Error(`Instance metadata answered ${response.status} for ${path}`);
  return response.text();
}

export async function readInstanceRegion(): Promise<string> {
  const token = await requestMetadataToken();
  return (await readMetadata(IMDS_REGION_PATH, token)).trim();
}

export async function readInstanceRoleCredentials(): Promise<InstanceRoleCredentials> {
  const token = await requestMetadataToken();
  const roleName = (await readMetadata(IMDS_ROLE_PATH, token)).trim();
  const role = JSON.parse(await readMetadata(`${IMDS_ROLE_PATH}${roleName}`, token));
  return {
    accessKeyId: role.AccessKeyId,
    secretAccessKey: role.SecretAccessKey,
    sessionToken: role.Token,
    expiration: new Date(role.Expiration)
  };
}
