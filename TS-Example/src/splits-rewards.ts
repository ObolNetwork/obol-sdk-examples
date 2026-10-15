/**
 * Deploy a rewards-only split: the principal goes to one address, rewards are
 * split among recipients. Use the returned addresses as the cluster's
 * withdrawal_address / fee_recipient_address.
 *
 * SDK methods:
 * - default:  splits.createValidatorManagerAndRewardsSplit (OVM + SplitV2)
 * - --legacy: createObolRewardsSplit (OWR + SplitMain), getOWRTranches
 *
 * Dry run (default): prints the payload. With --execute: deploys the
 * contracts from PRIVATE_KEY (sends transactions; needs Hoodi ETH for gas).
 *
 *   yarn splits:rewards
 *   yarn splits:rewards --execute
 *   yarn splits:rewards --legacy --execute
 *   OWR_ADDRESS=0x… yarn splits:rewards --legacy   # read an existing OWR
 *
 * Env: REWARD_RECIPIENTS ("0xA:50,0xB:49", must sum to 99 — the SDK adds the
 * 1% Obol RAF recipient), PRINCIPAL_RECIPIENT, OVM_OWNER (default: signer),
 * VALIDATOR_COUNT (legacy only: OWR principal = 32 ETH x count).
 */
import type {
  OVMRewardsSplitPayload,
  RewardsSplitPayload,
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
  const recipients = parseRecipients('REWARD_RECIPIENTS', [
    { address: PLACEHOLDER_A, percentAllocation: 50 },
    { address: PLACEHOLDER_B, percentAllocation: 49 },
  ]);
  const principalRecipient =
    optionalEnv('PRINCIPAL_RECIPIENT') ?? signerAddress ?? PLACEHOLDER_A;

  if (LEGACY) {
    const owrAddress = optionalEnv('OWR_ADDRESS');
    if (owrAddress !== undefined) {
      // Read-only: needs a provider, no signer.
      const tranches = await makeClient().getOWRTranches(owrAddress);
      console.log('OWR tranches:', tranches);
      return;
    }

    const payload: RewardsSplitPayload = {
      splitRecipients: recipients.map(r => ({
        account: r.address,
        percentAllocation: r.percentAllocation,
      })),
      principalRecipient,
      etherAmount: 32 * Number(optionalEnv('VALIDATOR_COUNT') ?? '1'),
    };
    if (!(await confirmExecute('deploy an OWR + SplitMain rewards split', payload))) {
      return;
    }
    const result = await makeClient({ signer: true }).createObolRewardsSplit(payload);
    console.log('withdrawal_address (OWR):', result.withdrawal_address);
    console.log('fee_recipient_address (splitter):', result.fee_recipient_address);
    return;
  }

  const payload: OVMRewardsSplitPayload = {
    rewardSplitRecipients: recipients,
    principalRecipient,
    OVMOwnerAddress: optionalEnv('OVM_OWNER') ?? signerAddress ?? PLACEHOLDER_A,
  };
  if (!(await confirmExecute('deploy an OVM + SplitV2 rewards split', payload))) {
    return;
  }
  const client = makeClient({ signer: true });
  const result = await client.splits.createValidatorManagerAndRewardsSplit(payload);
  console.log('withdrawal_address (OVM):', result.withdrawal_address);
  console.log('fee_recipient_address (SplitV2):', result.fee_recipient_address);
};

run(main);
