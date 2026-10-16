/**
 * Activate a cluster's validators: read verified deposit data from the lock,
 * then deposit.
 *
 * SDK methods: getDepositData, eoa.deposit, splits.deposit (when OVM_ADDRESS
 * is set).
 *
 * Dry run (default): getDepositData only (read-only).
 * With --execute: sends the deposit transaction(s) from PRIVATE_KEY.
 *
 *   yarn deposits <lockHash>
 *   yarn deposits <lockHash> --execute
 *   yarn deposits <lockHash> --assume-top-up --execute
 *
 * Before sending, the SDK checks every deposit (deposit_data_root, BLS
 * signature for the chain, amount, withdrawal credentials). --assume-top-up
 * passes `kind: 'topUp'`: you assert every deposit tops up a validator that
 * already exists on the beacon chain (no BLS check, the expected or all-zero
 * withdrawal credentials, up to 2048 ETH), e.g. Launchpad-style top-ups with
 * all-zero credentials and signature. A deposit to a validator that does not
 * exist yet is lost if you get this wrong.
 *
 * Env: PRIVATE_KEY, DEPOSIT_AMOUNT_WEI (when the lock has several deposit
 * amounts), OVM_ADDRESS (deposit through an OVM instead of the batch deposit
 * contract), EXPECTED_WITHDRAWAL_ADDRESS (EOA deposits: refuse other
 * credentials).
 */
import type { DepositKind } from '@obolnetwork/obol-sdk';
import { formatEther } from 'ethers';
import {
  args,
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
  for (const d of deposits) {
    console.log(`  ${d.pubkey.slice(0, 18)}… ${formatEther(d.amount)} ETH`);
  }

  const total = deposits.reduce((sum, d) => sum + BigInt(d.amount), 0n);
  const ovmAddress = optionalEnv('OVM_ADDRESS');
  const target = ovmAddress !== undefined ? `OVM ${ovmAddress}` : 'the batch deposit contract';
  if (
    !(await confirmExecute(
      `deposit ${deposits.length} validator(s), ${formatEther(total)} ETH in total, via ${target}${ASSUME_TOP_UP ? " (asserting all are top-ups: kind: 'topUp')" : ''}`,
    ))
  ) {
    return;
  }

  // Default `kind: 'deposit'`: deposits to new validators. An all-zero
  // signature (as used for top-ups) is then refused with code
  // DEPOSIT_LOOKS_LIKE_TOP_UP.
  const kind: DepositKind = ASSUME_TOP_UP ? 'topUp' : 'deposit';

  const signingClient = makeClient({ signer: true });
  const { txHashes } =
    ovmAddress !== undefined
      ? await signingClient.splits.deposit({ ovmAddress, deposits, kind })
      : await signingClient.eoa.deposit({
          deposits,
          kind,
          expectedWithdrawalAddress: optionalEnv('EXPECTED_WITHDRAWAL_ADDRESS'),
        });
  console.log('Deposit tx hashes:', txHashes);
};

run(main);
