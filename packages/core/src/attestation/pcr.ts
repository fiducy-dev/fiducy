import { PCR_HEX_PATTERN } from './constants.ts';

export function normalizePCR(measurement: string): string {
  return measurement.trim().toLowerCase();
}

export function isPCR(measurement: string): boolean {
  return PCR_HEX_PATTERN.test(normalizePCR(measurement));
}

export function parsePCRList(text: string | undefined): string[] {
  return (text ?? '').split(',').map(normalizePCR).filter(Boolean);
}
