/**
 * Activate a cluster's validators: read deposit data from the lock, check the
 * beacon chain for existing deposits, then deposit.
 *
 * SDK methods: getDepositData, checkExistingDeposits, eoa.deposit,
 * splits.deposit (when OVM_ADDRESS is set).
 *
 * Dry run (default): getDepositData + checkExistingDeposits only (read-only).
 * With --execute: sends the deposit transaction(s) from PRIVATE_KEY.
 *
 *   yarn deposits <lockHash>
 *   yarn deposits <lockHash> --execute
 *   yarn deposits <lockHash> --assume-top-up --execute
 *
 * Top-ups: by default `beaconUrl` is passed, so the SDK itself asks the beacon
 * node which deposits go to existing validators (top-ups: no BLS check, the
 * expected or all-zero withdrawal credentials, max amount from the existing
 * validator) and refuses conflicting pending deposits. --assume-top-up instead
 * passes `skipSignatureVerification: true` without `beaconUrl`: you assert
 * every deposit is a top-up, e.g. Launchpad-style deposits with all-zero
 * credentials and signature, when no beacon node is available. A deposit to a
 * validator that does not exist yet is lost if you get this wrong.
 *
 * Env: PRIVATE_KEY, BEACON_URL (defaults to a public node for the network),
 * DEPOSIT_AMOUNT_WEI (when the lock has several deposit amounts),
 * OVM_ADDRESS (deposit through an OVM instead of the batch deposit contract),
 * EXPECTED_WITHDRAWAL_ADDRESS (EOA deposits: refuse other credentials).
 */
import { DepositConflictError } from '@obolnetwork/obol-sdk';
import { formatEther } from 'ethers';
import {
  args,
  config,
  confirmExecute,
  makeClient,
  optionalEnv,
  requireEnv,
} from './shared/config.ts';
import { run } from './shared/run.ts';

const ASSUME_TOP_UP = process.argv.includes('--assume-top-up');

const main = async (): Promise<void> => {
  const lockHash = args()[0] ?? requireEnv('LOCK_HASH');
  const client = makeClient();

  // Validates the lock (signatures, hashes, every deposit signature) and
  // returns deposits with `amount` in wei. Locks with partial deposits may
  // carry several amounts; pick one with `amount`.
  const data = await client.getDepositData(lockHash, {
    amount: optionalEnv('DEPOSIT_AMOUNT_WEI'),
  });
  console.log(
    `Amounts in lock: ${data.amounts.map(a => `${formatEther(a)} ETH`).join(', ')}`,
  );
  const deposits = data.deposits;
  if (deposits === undefined) {
    throw new Error(
      `Lock has several deposit amounts; set DEPOSIT_AMOUNT_WEI to one of: ${data.amounts.join(', ')}`,
    );
  }

  // Advisory beacon-node check: new / top_up / conflict per deposit.
  const checks = await client.checkExistingDeposits(deposits, {
    beaconUrl: config.beaconUrl,
  });
  for (const c of checks) {
    const index =
      c.existing?.index !== undefined ? ` (index ${c.existing.index})` : '';
    console.log(`  ${c.pubkey.slice(0, 18)}… ${c.status}${index}`);
  }
  if (checks.some(c => c.status === 'top_up')) {
    console.log(
      'top_up = the validator already exists; depositing again adds to its balance.',
    );
  }
  if (checks.some(c => c.status === 'conflict')) {
    console.log('Conflicting pending deposits found; the SDK will refuse to deposit.');
  }

  const total = deposits.reduce((sum, d) => sum + BigInt(d.amount), 0n);
  const ovmAddress = optionalEnv('OVM_ADDRESS');
  const target = ovmAddress !== undefined ? `OVM ${ovmAddress}` : 'the batch deposit contract';
  if (
    !(await confirmExecute(
      `deposit ${deposits.length} validator(s), ${formatEther(total)} ETH in total, via ${target}${ASSUME_TOP_UP ? ' (asserting all are top-ups: skipSignatureVerification)' : ''}`,
    ))
  ) {
    return;
  }

  // Default: `beaconUrl`, so the SDK re-runs checkExistingDeposits, treats
  // existing validators as top-ups, and throws DepositConflictError instead of
  // sending anything if a pubkey has a pending deposit with other credentials.
  // --assume-top-up: no beacon node; the caller asserts these are top-ups.
  // (Without either, an all-zero signature is refused with code
  // DEPOSIT_LOOKS_LIKE_TOP_UP.)
  const topUpOptions = ASSUME_TOP_UP
    ? { skipSignatureVerification: true }
    : { beaconUrl: config.beaconUrl };

  const signingClient = makeClient({ signer: true });
  try {
    const { txHashes } =
      ovmAddress !== undefined
        ? await signingClient.splits.deposit({ ovmAddress, deposits, ...topUpOptions })
        : await signingClient.eoa.deposit({
            deposits,
            ...topUpOptions,
            expectedWithdrawalAddress: optionalEnv('EXPECTED_WITHDRAWAL_ADDRESS'),
          });
    console.log('Deposit tx hashes:', txHashes);
  } catch (err) {
    if (err instanceof DepositConflictError) {
      console.error(`${err.code}: ${err.message}`);
      for (const c of err.conflicts) {
        console.error(`  ${c.pubkey}: pending to ${c.existing?.withdrawal_credentials}`);
      }
      process.exitCode = 1;
      return;
    }
    throw err;
  }
};

run(main);
