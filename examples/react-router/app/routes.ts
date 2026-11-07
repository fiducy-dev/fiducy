import { index, route } from '@react-router/dev/routes';

import type { RouteConfig } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('api/fiducy/*', 'routes/fiducy.ts'),
  route('api/session', 'routes/session.ts'),
  route('api/ask', 'routes/ask.ts')
] satisfies RouteConfig;
