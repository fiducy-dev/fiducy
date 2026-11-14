import { isControlPlaneCall } from '../authentication';
import { respondWith } from '../responses';

import type { GatewayDependencies } from '../types';

export async function refreshApps(request: Request, dependencies: GatewayDependencies) {
  if (!isControlPlaneCall(request.headers, dependencies.controlPlaneToken)) {
    return respondWith(401, null, 'Only the control plane can refresh app configs');
  }
  await dependencies.appDirectory.refresh?.();
  return respondWith(200, null, 'App configs refreshed');
}
