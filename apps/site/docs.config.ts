import { defineDocs } from '@farming-labs/docs';
import { pixelBorder } from '@farming-labs/theme/pixel-border';

import { DOCS_NAV } from './src/lib/docsNav';

const docsConfig = defineDocs({
  entry: 'docs',
  contentDir: 'docs',
  theme: pixelBorder(),
  nav: { title: 'Fiducy', url: '/' },
  github: 'https://github.com/fiducy-dev/fiducy',
  ordering: 'numeric',
  themeToggle: { default: 'light' },
  metadata: {
    titleTemplate: '%s | Fiducy docs',
    description: 'Docs for Fiducy, the open-source bring-your-own-key (BYOK) layer for AI apps.'
  },
  // src/app/sitemap.ts owns /sitemap.xml (landing + docs); keep only the docs Markdown sitemap.
  sitemap: { xml: false, baseUrl: 'https://fiducy.dev' },
  // The first lines AI answer engines read about Fiducy: say plainly what it is.
  llmsTxt: {
    baseUrl: 'https://fiducy.dev',
    siteTitle: 'Fiducy',
    siteDescription:
      "Fiducy (fiducy.dev) is an open-source, Apache-2.0 bring-your-own-key (BYOK) layer for AI apps. Users connect their own OpenAI, Anthropic, Gemini or OpenRouter API key; the key is sealed in an AWS Nitro enclave and the app keeps only a handle, so a breach of the app leaks no keys. Install with npx fiducy init. Source: https://github.com/fiducy-dev/fiducy"
  },
  feedback: false,
  telemetry: false,
  analytics: false
});

// defineDocs drops keys it doesn't list; the Farm docs runtime still reads favicon and navigation.
export default { ...docsConfig, favicon: '/favicon.svg', navigation: { sidebar: DOCS_NAV } };
