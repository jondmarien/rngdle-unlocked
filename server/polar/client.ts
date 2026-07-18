/**
 * Shared Polar SDK client (org token via POLAR_API_KEY).
 */

import { Polar } from '@polar-sh/sdk';

let cached: Polar | null = null;

export function getPolarClient(): Polar {
  const accessToken = process.env.POLAR_API_KEY?.trim();
  if (!accessToken) {
    throw new Error('POLAR_API_KEY is not configured');
  }
  if (!cached) {
    cached = new Polar({ accessToken });
  }
  return cached;
}
