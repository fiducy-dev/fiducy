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
  feedback: false,
  telemetry: false,
  analytics: false
});

// defineDocs drops keys it doesn't list; the Farm docs runtime still reads favicon and navigation.
export default { ...docsConfig, favicon: '/favicon.svg', navigation: { sidebar: DOCS_NAV } };
