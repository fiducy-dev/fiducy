import { UsageError } from '../flags.ts';

import { PLACEMENT_ROUTE_PATTERN } from '../constants.ts';

import type { PlacementChoice, ProjectInfo, ResolvedPlacement } from '../types.ts';
import type { WidgetPlacement } from '../types.ts';

export function readPlacementChoice(value: string | undefined): PlacementChoice | undefined {
  if (value === undefined) return undefined;
  if (value === 'chat' || value === 'settings') return value;
  if (PLACEMENT_ROUTE_PATTERN.test(value)) return value as PlacementChoice;
  throw new UsageError(`--widget ${value} is not chat, settings or a route like /account`);
}

export function suggestPlacement(project: ProjectInfo): PlacementChoice {
  return project.chat === 'none' ? 'settings' : 'chat';
}

export function resolvePlacement(
  project: ProjectInfo,
  choice: PlacementChoice = suggestPlacement(project)
): ResolvedPlacement {
  if (choice === 'chat' && project.chat === 'none') {
    return { placement: { kind: 'settings' }, fellBack: true };
  }
  if (choice === 'chat' && project.chat !== 'none') {
    return { placement: { kind: 'chat', chat: project.chat }, fellBack: false };
  }
  if (choice === 'settings') return { placement: { kind: 'settings' }, fellBack: false };
  return { placement: { kind: 'route', route: choice }, fellBack: false };
}

export function describePlacement(placement: WidgetPlacement): string {
  if (placement.kind === 'chat') return 'in the chat, when a user sends a message without a key';
  if (placement.kind === 'settings') return 'on the settings page';
  return `on the ${placement.route} page`;
}
