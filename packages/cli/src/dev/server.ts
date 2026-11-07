import { createServer } from 'node:http';

import { sendWebResponse, toWebRequest } from '@fiducy/sdk/node';

import type { RequestHandler } from '@fiducy/gateway/src/types.ts';

export class PortInUseError extends Error {}

export function serveOnLocalhost(handler: RequestHandler, host: string, port: number) {
  const server = createServer(async (request, response) => {
    try {
      await sendWebResponse(await handler(toWebRequest(request)), response);
    } catch {
      if (!response.headersSent) response.statusCode = 500;
      response.end();
    }
  });
  return new Promise<{ close: () => Promise<void>; port: number }>((resolve, reject) => {
    server.once('error', (error: NodeJS.ErrnoException) =>
      reject(error.code === 'EADDRINUSE' ? new PortInUseError(String(port)) : error)
    );
    server.listen(port, host, () => {
      const address = server.address();
      const boundPort = typeof address === 'object' && address ? address.port : port;
      const close = () =>
        new Promise<void>((done) => {
          server.closeAllConnections();
          server.close(() => done());
        });
      resolve({ close, port: boundPort });
    });
  });
}
