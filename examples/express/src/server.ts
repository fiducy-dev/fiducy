import { sendWebResponse, toNodeHandler, toWebRequest } from '@fiducy/sdk/node';
import express from 'express';
import { createServer } from 'vite';
import { signInTestUser } from './example-kit';

import { answerQuestion } from './ask.ts';
import { fiducy } from './fiducy.ts';

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.all('/api/fiducy/{*path}', toNodeHandler(fiducy));
app.post('/api/session', async (_request, response) => sendWebResponse(signInTestUser(), response));
app.post('/api/ask', express.json(), async (request, response) =>
  sendWebResponse(await answerQuestion(toWebRequest(request)), response)
);

const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
app.use(vite.middlewares);

app.listen(port, () => console.log(`Listening on http://localhost:${port}`));
