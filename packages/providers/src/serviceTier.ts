import { REPLACED_SERVICE_TIERS } from './constants.ts';

import type { JSONObject, ServiceTierRule } from './types.ts';

function pinServiceTier(body: JSONObject, rule: ServiceTierRule) {
  if (rule.pinnedValue === null) return;
  for (const field of rule.fields) {
    const value = body[field];
    if (value === undefined || REPLACED_SERVICE_TIERS.includes(String(value))) {
      body[field] = rule.pinnedValue;
    }
  }
}

function isAllowedServiceTier(value: unknown, rule: ServiceTierRule): boolean {
  if (value === undefined) return true;
  return typeof value === 'string' && rule.allowedValues.includes(value.toLowerCase());
}

export function enforceServiceTier(body: JSONObject, rule: ServiceTierRule | null): boolean {
  if (!rule) return true;
  pinServiceTier(body, rule);
  return rule.fields.every((field) => isAllowedServiceTier(body[field], rule));
}
