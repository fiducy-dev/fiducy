export interface ExampleApp {
  name: string;
  directory: string;
  command: (port: number) => string[];
  readyPath?: string;
}

export interface ExampleConnection {
  gatewayURL: string;
  appID: string;
  appSecret: string;
}

export const EXAMPLE_APPS: ExampleApp[] = [
  {
    name: 'next',
    directory: 'next',
    command: (port) => ['bunx', '--bun', 'next', 'dev', '--port', String(port)]
  },
  {
    name: 'tanstack-start',
    directory: 'tanstack-start',
    command: (port) => ['bunx', 'vite', 'dev', '--port', String(port), '--strictPort']
  },
  {
    name: 'react-router',
    directory: 'react-router',
    command: (port) => ['bunx', 'react-router', 'dev', '--port', String(port), '--strictPort']
  },
  {
    name: 'sveltekit',
    directory: 'sveltekit',
    command: (port) => ['bunx', 'vite', 'dev', '--port', String(port), '--strictPort']
  },
  {
    name: 'nuxt',
    directory: 'nuxt',
    command: (port) => ['bunx', 'nuxt', 'dev', '--port', String(port)]
  },
  {
    name: 'express',
    directory: 'express',
    command: () => ['bunx', 'tsx', '--env-file-if-exists=.env', 'src/server.ts']
  },
  {
    name: 'farm',
    directory: 'farm',
    command: (port) => ['bunx', 'farm', 'dev', '--port', String(port)]
  }
];
