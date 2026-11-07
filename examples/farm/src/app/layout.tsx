import '@/lib/example-kit/styles.css';

import type { LayoutProps } from '@farm.js/core';

export const metadata = { title: 'Fiducy with Farm.js' };

export default function RootLayout({ children }: LayoutProps) {
  return children;
}
