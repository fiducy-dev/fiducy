import { toTanStackHandlers } from '@fiducy/sdk/tanstack';
import { createFileRoute } from '@tanstack/react-router';

import { fiducy } from '@/lib/fiducy';

export const Route = createFileRoute('/api/fiducy/$')({
  server: { handlers: toTanStackHandlers(fiducy) }
});
