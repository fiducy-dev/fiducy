import '@fontsource-variable/geist/wght.css';
import '@fontsource-variable/geist-mono/wght.css';
import './globals.css';

import { Analytics } from '@/components/Analytics';
import {
  ORGANIZATION_JSON_LD,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
  SOFTWARE_JSON_LD,
  WEBSITE_JSON_LD
} from '@/lib/site';

import type { LayoutProps, Metadata } from '@farm.js/core';

export const metadata: Metadata = {
  metadataBase: SITE_URL,
  title: { default: SITE_TITLE, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  alternates: { canonical: '/' },
  icons: { icon: '/favicon.svg', apple: '/apple-touch-icon.png' },
  openGraph: {
    siteName: SITE_NAME,
    type: 'website',
    url: '/',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION
  },
  twitter: { card: 'summary_large_image', title: SITE_TITLE, description: SITE_DESCRIPTION },
  jsonLd: [ORGANIZATION_JSON_LD, WEBSITE_JSON_LD, SOFTWARE_JSON_LD]
};

export default function RootLayout({ children }: LayoutProps) {
  return (
    <>
      <link rel="service-desc" href="/openapi.json" type="application/vnd.oai.openapi+json" />
      {children}
      <Analytics />
    </>
  );
}
