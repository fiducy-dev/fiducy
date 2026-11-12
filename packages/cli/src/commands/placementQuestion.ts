import { UsageError } from '../flags.ts';
import { readPlacementChoice, suggestPlacement } from '../project/placement.ts';

import { MAX_ROUTE_ATTEMPTS } from '../constants.ts';

import type { Ask, Output, PlacementChoice, ProjectInfo } from '../types.ts';

function describeChatOption(project: ProjectInfo): string {
  if (project.chat === 'assistant-ui') return 'found assistant-ui';
  if (project.chat === 'ai-sdk') return 'found AI SDK useChat';
  return 'no chat UI found, falls back to settings';
}

function printOptions(project: ProjectInfo, defaultNumber: number, { info, style }: Output) {
  const options = [
    `In the chat, when a user sends a message without a key  ${style.muted(`(${describeChatOption(project)})`)}`,
    'On the settings page',
    'On a page you name'
  ];
  info(`\n${style.accent('?')} ${style.heading('Where should users add their AI key?')}`);
  options.forEach((option, index) => {
    const marker = index + 1 === defaultNumber ? style.accent('›') : ' ';
    info(`${marker} ${style.badge(String(index + 1))}  ${option}`);
  });
}

async function askRoute(ask: Ask, output: Output): Promise<PlacementChoice> {
  for (let attempt = 0; attempt < MAX_ROUTE_ATTEMPTS; attempt += 1) {
    const answer = (await ask('  Page route, like /account: ')).trim();
    try {
      const choice = readPlacementChoice(answer.startsWith('/') ? answer : `/${answer}`);
      if (choice) return choice;
    } catch (error) {
      if (!(error instanceof UsageError)) throw error;
      output.info(output.style.warning(`  ${answer} is not a route. Try again.`));
    }
  }
  return 'settings';
}

export async function askPlacement(
  ask: Ask,
  project: ProjectInfo,
  output: Output
): Promise<PlacementChoice> {
  const suggested = suggestPlacement(project);
  const defaultNumber = suggested === 'chat' ? 1 : 2;
  printOptions(project, defaultNumber, output);
  const answer = (await ask(`  Choose 1-3 ${output.style.muted(`[${defaultNumber}]`)}: `)).trim();
  if (answer === '1') return 'chat';
  if (answer === '2') return 'settings';
  if (answer === '3') return askRoute(ask, output);
  return suggested;
}
