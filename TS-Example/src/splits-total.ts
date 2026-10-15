/**
 * Deploy a total split: both principal and rewards are split among
 * recipients. Use the returned addresses as the cluster's withdrawal_address /
 * fee_recipient_address.
 *
 * SDK methods:
 * - default:  splits.createValidatorManagerAndTotalSplit (OVM + SplitV2)
 * - --legacy: createObolTotalSplit (SplitMain only)
 *
 * Dry run (default): prints the payload. With --execute: deploys the
 * contracts from PRIVATE_KEY (sends transactions; needs Hoodi ETH for gas).
 *
 *   yarn splits:total
 *   yarn splits:total --execute
 *   yarn splits:total --legacy --execute
 *
 * Env: REWARD_RECIPIENTS (sum to 99; the SDK adds the 1% Obol RAF recipient),
 * PRINCIPAL_RECIPIENTS (sum to 100), OVM_OWNER (default: signer).
 * Legacy: REWARD_RECIPIENTS sum to 99.9 (0.1% RAF is added).
 */
import type {
  OVMTotalSplitPayload,
  TotalSplitPayload,
} from '@obolnetwork/obol-sdk';
import {
  confirmExecute,
  getSigner,
  makeClient,
  optionalEnv,
} from './shared/config.ts';
import { run } from './shared/run.ts';
import { PLACEHOLDER_A, PLACEHOLDER_B, parseRecipients } from './shared/splits.ts';

const LEGACY = process.argv.includes('--legacy');

const main = async (): Promise<void> => {
  const signerAddress = await getSigner()?.getAddress();

  if (LEGACY) {
    const recipients = parseRecipients('REWARD_RECIPIENTS', [
      { address: PLACEHOLDER_A, percentAllocation: 50 },
      { address: PLACEHOLDER_B, percentAllocation: 49.9 },
    ]);
    const payload: TotalSplitPayload = {
      splitRecipients: recipients.map(r => ({
        account: r.address,
        percentAllocation: r.percentAllocation,
      })),
    };
    if (!(await confirmExecute('deploy a SplitMain total split', payload))) {
      return;
    }
    const result = await makeClient({ signer: true }).createObolTotalSplit(payload);
    console.log('withdrawal_address = fee_recipient_address:', result.withdrawal_address);
    return;
  }

  const payload: OVMTotalSplitPayload = {
    rewardSplitRecipients: parseRecipients('REWARD_RECIPIENTS', [
      { address: PLACEHOLDER_A, percentAllocation: 50 },
      { address: PLACEHOLDER_B, percentAllocation: 49 },
    ]),
    principalSplitRecipients: parseRecipients('PRINCIPAL_RECIPIENTS', [
      { address: PLACEHOLDER_A, percentAllocation: 50 },
      { address: PLACEHOLDER_B, percentAllocation: 50 },
    ]),
    OVMOwnerAddress: optionalEnv('OVM_OWNER') ?? signerAddress ?? PLACEHOLDER_A,
  };
  if (!(await confirmExecute('deploy an OVM + SplitV2 total split', payload))) {
    return;
  }
  const client = makeClient({ signer: true });
  const result = await client.splits.createValidatorManagerAndTotalSplit(payload);
  console.log('withdrawal_address (OVM):', result.withdrawal_address);
  console.log('fee_recipient_address (SplitV2):', result.fee_recipient_address);
};

run(main);
