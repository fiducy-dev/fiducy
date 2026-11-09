import { defineDocs } from '@farming-labs/docs';
import { pixelBorder } from '@farming-labs/theme/pixel-border';

import { DOCS_ICONS } from './src/lib/docsIcons';
import { DOCS_NAV } from './src/lib/docsNav';

const docsConfig = defineDocs({
  entry: 'docs',
  contentDir: 'docs',
  theme: pixelBorder(),
  nav: { title: 'FIDUCY', url: '/' },
  github: 'https://github.com/fiducy-dev/fiducy',
  ordering: 'numeric',
  icons: DOCS_ICONS,
  themeToggle: { default: 'light' },
  feedback: false,
  telemetry: false,
  analytics: false
});

// defineDocs drops keys it doesn't list; the Farm docs runtime still reads favicon and navigation.
export default { ...docsConfig, favicon: '/favicon.svg', navigation: { sidebar: DOCS_NAV } };
