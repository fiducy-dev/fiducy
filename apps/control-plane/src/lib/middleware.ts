import { auth } from '@farm.js/auth/server';

import { isRecentSignIn, readBearerToken } from './common';
import { SIGN_IN_AGAIN_MESSAGE, TWO_FACTOR_HEADER } from './constants';
import { noteGatewayContact } from './gatewayStatusService';
import { respondWith, respondWithFailure } from './responses';
import { matchesToken } from './secrets';
import { getControlStore } from './storage';
import { checkSecondFactor } from './twoFactorService';

import type { EndpointMiddlewareContext } from '@farm.js/core/api';

export async function requireOwner() {
  const user = await auth.user();
  if (!user) return respondWith(401, null, 'Sign in to manage your apps');
  return { ownerID: user.id };
}

export async function requireRecentSignIn() {
  const current = await auth.session();
  if (!current) return respondWith(401, null, 'Sign in to manage your apps');
  if (!isRecentSignIn(current.session.createdAt)) {
    return respondWith(401, null, SIGN_IN_AGAIN_MESSAGE);
  }
  return { ownerID: current.user.id, ownerEmail: current.user.email };
}

export async function requireSecondFactor({
  request,
  context
}: EndpointMiddlewareContext<{ ownerID: string }>) {
  const code = (request.headers.get(TWO_FACTOR_HEADER) ?? '').trim();
  const checked = await checkSecondFactor(getControlStore(), context.ownerID, code);
  if (!checked.ok) return respondWithFailure(checked.error);
  return true;
}

export async function requireGateway({ request }: EndpointMiddlewareContext) {
  const gatewayToken = process.env.FIDUCY_GATEWAY_TOKEN;
  if (!gatewayToken)
    return respondWith(503, null, 'Set FIDUCY_GATEWAY_TOKEN to accept the gateway');
  const receivedToken = readBearerToken(request.headers);
  if (!matchesToken(receivedToken, gatewayToken)) {
    return respondWith(401, null, 'This gateway token is not valid');
  }
  await noteGatewayContact(getControlStore());
  return true;
}
