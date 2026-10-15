/**
 * Shared configuration for every example script.
 *
 * - Network: Hoodi (560048) against the non-production dev Obol API by default.
 *   Mainnet is only used when OBOL_NETWORK=mainnet is set explicitly.
 * - Signer: an ethers `Wallet` from PRIVATE_KEY, connected to RPC_URL.
 * - Writes: scripts that send transactions or write to the Obol API do a dry
 *   run unless `--execute` is passed on the command line.
 *
 * See `.env.example` for every variable.
 */
import { Client } from '@obolnetwork/obol-sdk';
import { JsonRpcProvider, Wallet } from 'ethers';

export type NetworkName = 'hoodi' | 'mainnet';

type NetworkDefaults = {
  chainId: number;
  apiUrl: string;
  rpcUrl: string;
  beaconUrl: string;
  launchpadUrl: string;
};

/** Non-production dev Obol API (Hoodi data only). */
export const DEV_API_URL = 'https://obol-api-nonprod-dev.dev.obol.tech';
/** Production Obol API. */
export const PROD_API_URL = 'https://api.obol.tech';

const NETWORKS: Record<NetworkName, NetworkDefaults> = {
  hoodi: {
    chainId: 560048,
    apiUrl: DEV_API_URL,
    rpcUrl: 'https://ethereum-hoodi-rpc.publicnode.com',
    beaconUrl: 'https://ethereum-hoodi-beacon-api.publicnode.com',
    launchpadUrl: 'https://dev.launchpad.obol.org',
  },
  mainnet: {
    chainId: 1,
    apiUrl: PROD_API_URL,
    rpcUrl: 'https://ethereum-rpc.publicnode.com',
    beaconUrl: 'https://ethereum-beacon-api.publicnode.com',
    launchpadUrl: 'https://launchpad.obol.org',
  },
};

const env = (name: string): string | undefined => {
  const value = process.env[name]?.trim();
  return value === undefined || value === '' ? undefined : value;
};

const parseNetwork = (): NetworkName => {
  const raw = (env('OBOL_NETWORK') ?? 'hoodi').toLowerCase();
  if (raw !== 'hoodi' && raw !== 'mainnet') {
    throw new Error(`OBOL_NETWORK must be "hoodi" or "mainnet", got "${raw}"`);
  }
  return raw;
};

/**
 * The SDK wants the bare API origin (it adds `/v1/...` itself) and only
 * accepts the official Obol API URLs. The launchpad's NEXT_PUBLIC_API_URL
 * carries a `/v1` suffix, so strip it if someone pastes that.
 */
const normaliseApiUrl = (url: string): string =>
  url.replace(/\/+$/, '').replace(/\/v1$/, '');

export const network: NetworkName = parseNetwork();
const defaults = NETWORKS[network];

export const config = {
  network,
  chainId: defaults.chainId,
  apiUrl: normaliseApiUrl(env('OBOL_API_URL') ?? defaults.apiUrl),
  rpcUrl: env('RPC_URL') ?? defaults.rpcUrl,
  beaconUrl: env('BEACON_URL') ?? defaults.beaconUrl,
  launchpadUrl: env('LAUNCHPAD_URL') ?? defaults.launchpadUrl,
  privateKey: env('PRIVATE_KEY'),
};

/** Positional command-line arguments (everything that is not a --flag). */
export const args = (): string[] =>
  process.argv.slice(2).filter(a => !a.startsWith('--'));

/** True when the script was started with `--execute`. */
export const EXECUTE = process.argv.includes('--execute');

/** Reads an environment variable, throwing a helpful error if it is missing. */
export const requireEnv = (name: string, hint?: string): string => {
  const value = env(name);
  if (value === undefined) {
    throw new Error(
      `Missing ${name}. ${hint ?? 'Set it in .env (see .env.example).'}`,
    );
  }
  return value;
};

/** Reads an optional environment variable. */
export const optionalEnv = env;

let bannerPrinted = false;

/** Prints the network / API / mode once, with a loud warning on mainnet. */
export const printBanner = (): void => {
  if (bannerPrinted) return;
  bannerPrinted = true;
  console.log(
    `network=${config.network} (chainId ${config.chainId})  api=${config.apiUrl}  mode=${EXECUTE ? 'EXECUTE' : 'dry-run'}`,
  );
  if (config.network === 'mainnet') {
    console.warn(
      [
        '',
        '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!',
        '!!  MAINNET: OBOL_NETWORK=mainnet is set.                             !!',
        '!!  Transactions spend real ETH and API writes go to production data. !!',
        '!!  Unset OBOL_NETWORK to go back to Hoodi + the dev API.             !!',
        '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!',
        '',
      ].join('\n'),
    );
  } else if (config.apiUrl === PROD_API_URL) {
    console.warn(
      'NOTE: OBOL_API_URL points at the production Obol API; Hoodi writes will be visible on hoodi.launchpad.obol.org.',
    );
  }
};

/** Read-only provider for the selected network. */
export const getProvider = (): JsonRpcProvider =>
  new JsonRpcProvider(config.rpcUrl, config.chainId, { staticNetwork: true });

/** ethers Wallet from PRIVATE_KEY connected to RPC_URL, or undefined if unset. */
export const getSigner = (): Wallet | undefined =>
  config.privateKey !== undefined
    ? new Wallet(config.privateKey, getProvider())
    : undefined;

/** Like {@link getSigner}, but throws if PRIVATE_KEY is not set. */
export const requireSigner = (): Wallet => {
  const signer = getSigner();
  if (signer === undefined) {
    throw new Error(
      'PRIVATE_KEY is required for this step. Use a throwaway Hoodi key; never a key holding mainnet funds.',
    );
  }
  return signer;
};

/**
 * Builds an Obol SDK client for the configured network.
 *
 * With `signer: true` the client gets the PRIVATE_KEY wallet (required for
 * writes); otherwise it is read-only and only uses a provider for on-chain reads.
 */
export const makeClient = (opts: { signer?: boolean } = {}): Client => {
  printBanner();
  const provider = getProvider();
  if (opts.signer === true) {
    return new Client(
      { baseUrl: config.apiUrl, chainId: config.chainId },
      requireSigner(),
      provider,
    );
  }
  return new Client(
    { baseUrl: config.apiUrl, chainId: config.chainId },
    undefined,
    provider,
  );
};

/** Launchpad page where operators can accept a cluster invite. */
export const inviteUrl = (configHash: string): string =>
  `${config.launchpadUrl}/dv?configHash=${configHash}`;

/**
 * Guards a write. In dry-run mode prints what would happen and returns false;
 * with `--execute` returns true (after a 5 s pause on mainnet so Ctrl+C still works).
 */
export const confirmExecute = async (
  action: string,
  details?: unknown,
): Promise<boolean> => {
  printBanner();
  if (!EXECUTE) {
    console.log(`\n[dry-run] Would ${action}.`);
    if (details !== undefined) console.dir(details, { depth: null });
    console.log('[dry-run] Re-run with --execute to do it.');
    return false;
  }
  console.log(`\n[execute] ${action}`);
  if (config.network === 'mainnet') {
    console.warn('[execute] MAINNET: continuing in 5 seconds, Ctrl+C to abort.');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  return true;
};
