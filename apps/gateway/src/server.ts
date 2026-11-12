import { loadEnclaveConfig } from './enclaveConfig';
import { createGatewayFromEnvironment, startTlsFrontFromEnvironment } from './environment';

await loadEnclaveConfig();

const { handleRequest, keyWrapperName, keyWrapper } = await createGatewayFromEnvironment();

const server = Bun.serve({
  port: Number(process.env.PORT ?? 8787),
  idleTimeout: 255,
  fetch: handleRequest
});
console.log(`Gateway listening on ${server.url} (keys wrapped by ${keyWrapperName})`);

await startTlsFrontFromEnvironment(keyWrapper);
