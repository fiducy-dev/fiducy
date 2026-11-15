import type { ControlStore, GatewayProbe, GatewayStatus } from './types';

export async function noteGatewayContact(store: ControlStore, now = new Date()) {
  await store.saveGatewayHeartbeat({ lastSeenAt: now.toISOString() });
}

// Reachability and the enclave come from checking the gateway now. The time the gateway last
// called in only shows that its token works; an idle gateway does not call in.
export async function readGatewayStatus(
  store: ControlStore,
  probe: GatewayProbe,
  now = new Date()
): Promise<GatewayStatus> {
  const [heartbeat, probed] = await Promise.all([store.readGatewayHeartbeat(), probe()]);
  return {
    reachable: probed.healthy,
    lastSeenAt: heartbeat?.lastSeenAt ?? null,
    pcr0: probed.enclave.pcr0,
    attestedAt: probed.enclave.pcr0 ? now.toISOString() : null,
    attestationProblem: probed.enclave.problem,
    region: process.env.AWS_REGION ?? null
  };
}
