import { DOCS_SLUGS } from '@/lib/docsNav';
import { SITE_URL } from '@/lib/site';

import type { MetadataRoute } from '@farm.js/core';

// One sitemap for the landing pages and the docs. docs.config.ts turns off the docs engine's
// XML sitemap, which lists only docs pages, so it does not shadow this one.
const PAGES = ['', '/setup', '/about', '/contact', '/privacy'];

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...PAGES.map((path) => ({ url: `${SITE_URL}${path || '/'}`, priority: path ? 0.6 : 1 })),
    ...DOCS_SLUGS.map((slug) => ({
      url: `${SITE_URL}/docs${slug ? `/${slug}` : ''}`,
      priority: slug ? 0.7 : 0.9
    }))
  ];
}
