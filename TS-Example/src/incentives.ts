/**
 * Check and claim Obol incentives (OBOL tokens from a Merkle distributor).
 *
 * SDK methods: incentives.getIncentivesByAddress, incentives.isClaimed,
 * incentives.preflightClaim, incentives.claimIncentives.
 *
 * Dry run (default): reads the incentives and runs preflightClaim (read-only
 * API + on-chain checks). With --execute: sends the claim transaction from
 * PRIVATE_KEY.
 *
 * The claim can be sent for any address: the signer pays the gas and the
 * tokens always go to the address being claimed for. So an operator can claim
 * from its own key, or a relayer / cluster admin can claim on its behalf.
 *
 *   yarn incentives <recipientAddress>             # dry run
 *   yarn incentives <recipientAddress> --execute   # claim for that address
 *   yarn incentives --execute                      # claim for the PRIVATE_KEY address
 */
import { IncentivesPreflightError } from '@obolnetwork/obol-sdk';
import { formatEther } from 'ethers';
import { args, confirmExecute, getSigner, makeClient } from './shared/config.ts';
import { describeError, printIssues, run } from './shared/run.ts';

const main = async (): Promise<void> => {
  const signerAddress = await getSigner()?.getAddress();
  const recipient = args()[0] ?? signerAddress;
  if (recipient === undefined) {
    throw new Error('Usage: yarn incentives <address> [--execute] (or set PRIVATE_KEY)');
  }
  const client = makeClient();

  // Read-only API + on-chain checks. Problems come back as issues (code /
  // message / hint / severity), not exceptions. An address with nothing to
  // claim gets NO_INCENTIVES (INCENTIVES_NOT_FOUND on a 404).
  const preflight = await client.incentives.preflightClaim(recipient);
  printIssues('preflightClaim', preflight);
  const nothingToClaim = preflight.issues.some(
    i => i.code === 'NO_INCENTIVES' || i.code === 'INCENTIVES_NOT_FOUND',
  );
  if (nothingToClaim) {
    console.log(`No incentives for ${recipient} on this network.`);
    return;
  }

  const data = await client.incentives.getIncentivesByAddress(recipient);
  console.log(`Incentives for ${recipient}: ${formatEther(data.amount)} OBOL`);
  console.log(`  distributor ${data.contract_address}, index ${data.index}`);
  const claimed = await client.incentives.isClaimed(data.contract_address, data.index);
  console.log(`  already claimed: ${claimed}`);

  const onBehalf =
    signerAddress !== undefined &&
    signerAddress.toLowerCase() !== recipient.toLowerCase();
  if (
    !(await confirmExecute(
      `claim incentives for ${recipient}${onBehalf ? ` (gas paid by ${signerAddress})` : ''}`,
    ))
  ) {
    return;
  }

  try {
    // Runs preflightClaim again and throws IncentivesPreflightError on issues.
    const { txHash } = await makeClient({ signer: true }).incentives.claimIncentives(
      recipient,
    );
    console.log(txHash !== null ? `Claimed: ${txHash}` : 'Already claimed.');
  } catch (err) {
    if (err instanceof IncentivesPreflightError) {
      // e.g. issues[0].code === 'NO_INCENTIVES' or 'ALREADY_CLAIMED'
      console.error(describeError(err));
      for (const issue of err.issues) console.error(`  [${issue.code}] ${issue.message}`);
      process.exitCode = 1;
      return;
    }
    throw err;
  }
};

run(main);
