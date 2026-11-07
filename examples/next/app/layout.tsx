import '@/lib/example-kit/styles.css';

import type { ReactNode } from 'react';

export const metadata = { title: 'Fiducy with Next.js' };

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="en">
    <body>{children}</body>
  </html>
);

export default RootLayout;
