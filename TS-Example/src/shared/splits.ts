/** Helpers shared by the splits examples. */
import { optionalEnv } from './config.ts';

export type Recipient = { address: string; percentAllocation: number };

/**
 * Parses "0xA:50,0xB:49" into recipients. Falls back to `fallback`.
 *
 * Rewards recipients must sum to 99%: the SDK appends the 1% Obol
 * retroactive-funding (RAF) recipient itself. Principal recipients of a total
 * split must sum to 100%.
 */
export const parseRecipients = (
  envName: string,
  fallback: Recipient[],
): Recipient[] => {
  const raw = optionalEnv(envName);
  if (raw === undefined) return fallback;
  return raw.split(',').map(entry => {
    const [address, pct] = entry.split(':');
    if (address === undefined || pct === undefined) {
      throw new Error(`${envName}: expected "0xAddress:percent,...", got "${entry}"`);
    }
    return { address: address.trim(), percentAllocation: Number(pct) };
  });
};

// Placeholder Hoodi addresses; set the *_RECIPIENTS env vars for real use.
export const PLACEHOLDER_A = '0xC35CfCd67b9C27345a54EDEcC1033F2284148c81';
export const PLACEHOLDER_B = '0x33807D6F1DCe44b9C599fFE03640762A6F08C496';
