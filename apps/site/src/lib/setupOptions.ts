import type { SetupQuestion } from '@/types';

export const NOT_SURE = 'not-sure';

const NOT_SURE_OPTION = {
  id: NOT_SURE,
  label: 'Not sure',
  detail: 'Your agent checks the code and picks.'
};

export const SETUP_QUESTIONS: SetupQuestion[] = [
  {
    id: 'framework',
    step: 'Framework',
    title: 'What is your app built with?',
    helper: 'Fiducy adds a key route and a server module to it.',
    options: [
      { id: 'next', label: 'Next.js', detail: 'App Router', docs: 'frameworks/next' },
      {
        id: 'tanstack-start',
        label: 'TanStack Start',
        detail: 'Server routes',
        docs: 'frameworks/tanstack-start'
      },
      {
        id: 'react-router',
        label: 'React Router',
        detail: 'Framework mode',
        docs: 'frameworks/react-router'
      },
      {
        id: 'sveltekit',
        label: 'SvelteKit',
        detail: 'Server endpoints',
        docs: 'frameworks/sveltekit'
      },
      { id: 'nuxt', label: 'Nuxt', detail: 'Nitro server routes', docs: 'frameworks/nuxt' },
      { id: 'farmjs', label: 'Farm.js', detail: 'API routes', docs: 'frameworks/farm' },
      { id: 'express', label: 'Express', detail: 'Or plain Node', docs: 'frameworks/express' },
      { id: 'hono', label: 'Hono', detail: 'Web standard handler', docs: 'frameworks' },
      NOT_SURE_OPTION
    ]
  },
  {
    id: 'auth',
    step: 'Auth',
    title: 'How do people sign in?',
    helper: 'Each key belongs to a signed-in user, so Fiducy reads the user from your session.',
    options: [
      { id: 'better-auth', label: 'Better Auth', detail: 'Session from auth.api' },
      { id: 'authjs', label: 'Auth.js', detail: 'NextAuth and friends' },
      { id: 'clerk', label: 'Clerk', detail: 'Server auth helper' },
      { id: 'none', label: 'No sign-in yet', detail: 'Your agent adds sign-in first.' },
      NOT_SURE_OPTION
    ]
  },
  {
    id: 'storage',
    step: 'Database',
    title: 'Where should key handles live?',
    helper: 'Handles open nothing on their own, but they need a table that survives restarts.',
    options: [
      {
        id: 'drizzle',
        label: 'Drizzle',
        detail: 'Generates a schema file',
        docs: 'storage/drizzle'
      },
      { id: 'prisma', label: 'Prisma', detail: 'Generates a model', docs: 'storage/prisma' },
      {
        id: 'kysely',
        label: 'Kysely or SQL',
        detail: 'Postgres, MySQL or SQLite',
        docs: 'storage/sql'
      },
      {
        id: 'sqlite',
        label: 'No database yet',
        detail: 'A local SQLite file to start',
        docs: 'storage'
      },
      NOT_SURE_OPTION
    ]
  },
  {
    id: 'chat',
    step: 'Chat UI',
    title: 'Where do users chat?',
    helper: 'Your agent fits the key box to it.',
    options: [
      {
        id: 'assistant-ui',
        label: 'assistant-ui',
        detail: 'Key box inside the thread',
        docs: 'assistant-ui'
      },
      { id: 'react', label: 'React', detail: 'AI SDK useChat or your own', docs: 'widget/react' },
      { id: 'vue', label: 'Vue', detail: 'FiducyKey component', docs: 'widget/vue' },
      { id: 'svelte', label: 'Svelte', detail: 'FiducyKey component', docs: 'widget/svelte' },
      { id: 'solid', label: 'Solid', detail: 'FiducyKey component', docs: 'widget/solid' },
      { id: 'html', label: 'Anything else', detail: 'The <fiducy-key> element', docs: 'widget' },
      NOT_SURE_OPTION
    ]
  },
  {
    id: 'widget',
    step: 'Key box',
    title: 'Where should users add their key?',
    helper: 'Your agent puts the key box here. You can add it in the other place later.',
    options: [
      {
        id: 'chat',
        label: 'In the chat',
        detail: 'Shows up when a key is missing'
      },
      { id: 'settings', label: 'Settings page', detail: 'Add keys ahead of time' },
      { ...NOT_SURE_OPTION, detail: 'Chat if you have one, else settings' }
    ]
  },
  {
    id: 'providers',
    step: 'Providers',
    title: 'Which keys will users bring?',
    helper: 'Pick every provider your app calls. You can add more later.',
    isMultiple: true,
    options: [
      { id: 'openai', label: 'OpenAI', detail: 'GPT models' },
      { id: 'anthropic', label: 'Anthropic', detail: 'Claude models' },
      { id: 'gemini', label: 'Google Gemini', detail: 'Gemini models' },
      { id: 'openrouter', label: 'OpenRouter', detail: 'Many models, one key' }
    ]
  }
];

export const SETUP_STEPS = [...SETUP_QUESTIONS.map((question) => question.step), 'Your setup'];
