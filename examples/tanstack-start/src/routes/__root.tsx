import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router';

import stylesURL from '@/lib/example-kit/styles.css?url';

import type { ReactNode } from 'react';

const RootDocument = ({ children }: { children: ReactNode }) => (
  <html lang="en">
    <head>
      <HeadContent />
    </head>
    <body>
      {children}
      <Scripts />
    </body>
  </html>
);

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Fiducy with TanStack Start' }
    ],
    links: [{ rel: 'stylesheet', href: stylesURL }]
  }),
  shellComponent: RootDocument
});
