import { GITHUB_URL } from '@/lib/constants';

export const SITE_URL = 'https://fiducy.dev';
export const SITE_NAME = 'Fiducy';
export const SITE_TITLE = 'Fiducy: open-source BYOK for AI apps, without holding user keys';
export const SITE_DESCRIPTION =
  'Fiducy is an open-source bring-your-own-key (BYOK) layer for AI apps. Users bring their OpenAI, Anthropic, Gemini or OpenRouter key; your app never stores or sees it.';
// One sentence that says what Fiducy is, so search engines and AI answers don't confuse it
// with unrelated companies of a similar name.
export const SITE_DISAMBIGUATION =
  "Fiducy (fiducy.dev) is an open-source developer tool that lets AI apps use their users' own API keys without storing them.";
export const NPM_URL = 'https://www.npmjs.com/package/@fiducy/sdk';
export const ISSUES_URL = `${GITHUB_URL}/issues`;
export const MAINTAINER_NAME = 'Benoni Taddesse';
export const MAINTAINER_CITY = 'San Francisco';
export const NEW_TAB = { target: '_blank', rel: 'noopener noreferrer' } as const;

export const ORGANIZATION_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/apple-touch-icon.png`,
  description: SITE_DESCRIPTION,
  disambiguatingDescription: SITE_DISAMBIGUATION,
  founder: { '@type': 'Person', name: MAINTAINER_NAME },
  sameAs: [GITHUB_URL, NPM_URL],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    url: `${SITE_URL}/contact`
  },
  address: {
    '@type': 'PostalAddress',
    addressLocality: MAINTAINER_CITY,
    addressRegion: 'CA',
    addressCountry: 'US'
  }
};

export const WEBSITE_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  alternateName: ['fiducy.dev', 'Fiducy BYOK'],
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL }
};

export const SOFTWARE_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  disambiguatingDescription: SITE_DISAMBIGUATION,
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Linux, macOS, Windows',
  license: 'https://www.apache.org/licenses/LICENSE-2.0',
  isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  keywords:
    'BYOK, bring your own key, AI API key custody, OpenAI key, Anthropic key, Gemini key, OpenRouter key, AWS Nitro enclave',
  codeRepository: GITHUB_URL,
  downloadUrl: NPM_URL,
  sameAs: [GITHUB_URL, NPM_URL],
  author: { '@type': 'Person', name: MAINTAINER_NAME },
  publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL }
};
