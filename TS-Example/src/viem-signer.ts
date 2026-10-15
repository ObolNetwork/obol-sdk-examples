/**
 * Use the SDK from a viem app: wrap a viem WalletClient / PublicClient as the
 * ethers Signer / Provider the Client expects.
 *
 * SDK exports: walletClientToSigner, publicClientToProvider (from the
 * `@obolnetwork/obol-sdk/viem` subpath; `viem` is an optional peer dependency).
 *
 * Dry run (default): reads whether the account accepted the Obol terms.
 * With --execute: accepts the terms (EIP-712 signature via viem, API write).
 *
 *   yarn viem
 *   yarn viem --execute
 *
 * Env: PRIVATE_KEY (or swap `privateKeyToAccount` for a browser wallet's
 * `custom(window.ethereum)` transport in a dapp).
 */
import { Client } from '@obolnetwork/obol-sdk';
import {
  publicClientToProvider,
  walletClientToSigner,
} from '@obolnetwork/obol-sdk/viem';
import { createPublicClient, createWalletClient, http, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { hoodi, mainnet } from 'viem/chains';
import {
  config,
  confirmExecute,
  printBanner,
  requireEnv,
} from './shared/config.ts';
import { run } from './shared/run.ts';

const main = async (): Promise<void> => {
  printBanner();
  const chain = config.chainId === 1 ? mainnet : hoodi;
  const transport = http(config.rpcUrl);
  const account = privateKeyToAccount(requireEnv('PRIVATE_KEY') as Hex);

  const walletClient = createWalletClient({ account, chain, transport });
  const publicClient = createPublicClient({ chain, transport });

  const client = new Client(
    { baseUrl: config.apiUrl, chainId: config.chainId },
    walletClientToSigner(walletClient),
    publicClientToProvider(publicClient),
  );

  const accepted = await client.hasAcceptedTerms(); // defaults to the signer's address
  console.log(`${account.address} has accepted the Obol terms: ${accepted}`);

  if (accepted || !(await confirmExecute('sign and submit the Obol terms acceptance'))) {
    return;
  }
  const message = await client.acceptObolLatestTermsAndConditions({ ifNotAccepted: true });
  console.log('Terms:', message);
};

run(main);
