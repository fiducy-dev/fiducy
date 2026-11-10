import { AGENT_SETUP_PROMPT } from '@/lib/agentPrompt';
import { NOT_SURE, SETUP_QUESTIONS } from '@/lib/setupOptions';

import type { SetupAnswers, SetupOption, SetupQuestionID } from '@/types';

const DOCS_BASE = 'https://fiducy.dev/docs';
const CLI = 'npx fiducy@beta';
const INIT_FLAGS: SetupQuestionID[] = ['framework', 'auth', 'widget'];

function chosenOptions(answers: SetupAnswers, id: SetupQuestionID): SetupOption[] {
  const options = SETUP_QUESTIONS.find((question) => question.id === id)?.options ?? [];
  return options.filter((option) => answers[id].includes(option.id));
}

export function describeAnswer(answers: SetupAnswers, id: SetupQuestionID): string {
  const labels = chosenOptions(answers, id).map((option) => option.label);
  return labels.length > 0 ? labels.join(', ') : 'Not picked';
}

export function buildInitCommand(answers: SetupAnswers): string {
  const flags = INIT_FLAGS.flatMap((id) => {
    const value = answers[id][0];
    if (!value || value === NOT_SURE || value === 'none') return [];
    return [`--${id} ${value}`];
  });
  return [`${CLI} init`, ...flags].join(' ');
}

export function listDocsPages(answers: SetupAnswers): string[] {
  const pages = SETUP_QUESTIONS.flatMap((question) =>
    chosenOptions(answers, question.id).flatMap((option) => (option.docs ? [option.docs] : []))
  );
  return [...new Set(pages)].map((page) => `${DOCS_BASE}/${page}`);
}

function describeStack(answers: SetupAnswers): string {
  return SETUP_QUESTIONS.map((question) => {
    const value = answers[question.id].includes(NOT_SURE)
      ? 'not sure, detect it from the code'
      : describeAnswer(answers, question.id);
    return `- ${question.step}: ${value}`;
  }).join('\n');
}

export function buildSetupPrompt(answers: SetupAnswers): string {
  const pages = listDocsPages(answers).map((page) => `- ${page}.md`);
  const noAuth = answers.auth.includes('none')
    ? '\nThere is no sign-in yet. Before anything else, add sign-in (Better Auth with email and password is the quickest), then continue.\n'
    : '';
  return `I picked this stack on fiducy.dev/setup. Check it against the code and tell me if anything is different:
${describeStack(answers)}
${noAuth}
In step 2, run init as: ${buildInitCommand(answers)}
Run every fiducy command below as ${CLI} (for example ${CLI} init --dry-run), because the plain fiducy package on npm is an older beta.
Pages for this stack:
${pages.join('\n') || '- none, use the general pages below'}

${AGENT_SETUP_PROMPT}`;
}
