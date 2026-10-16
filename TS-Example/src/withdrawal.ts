/**
 * Request an EIP-7002 execution-layer withdrawal (partial or full exit) for a
 * validator, either from an EOA or through an OVM contract.
 *
 * SDK methods: getWithdrawalRequestFee, eoa.requestWithdrawal,
 * splits.requestWithdrawal.
 *
 * Dry run (default): reads the current EIP-7002 fee and prints the request. With --execute: sends the withdrawal
 * request transaction from PRIVATE_KEY (which must be the validator's
 * withdrawal address, or have the OVM's withdrawal role). The SDK reads the
 * current EIP-7002 fee and sends twice that unless you pass a fee.
 *
 *   yarn withdrawal <pubkey> [amountEth]            # EOA; amount 0 = full exit
 *   OVM_ADDRESS=0x… yarn withdrawal <pubkey> [amountEth] --execute
 */
import { getWithdrawalRequestFee } from '@obolnetwork/obol-sdk';
import { isHexString, parseUnits } from 'ethers';
import {
  args,
  confirmExecute,
  getProvider,
  makeClient,
  optionalEnv,
  printBanner,
} from './shared/config.ts';
import { run } from './shared/run.ts';

const main = async (): Promise<void> => {
  const [pubkey, amountArg] = args();
  if (pubkey === undefined) {
    throw new Error('Usage: yarn withdrawal <validatorPubkey> [amountEth] [--execute]');
  }
  if (!isHexString(pubkey, 48)) {
    throw new Error(`Not a validator pubkey (0x + 48 bytes hex): ${pubkey}`);
  }
  const amountEth = amountArg ?? '0';
  const ovmAddress = optionalEnv('OVM_ADDRESS');
  printBanner();
  // Read-only call to the EIP-7002 withdrawal request contract.
  const fee = await getWithdrawalRequestFee(getProvider());
  console.log(`Current withdrawal request fee: ${fee} wei (the SDK sends 2x unless you pass a fee)`);
  const kind = amountEth === '0' ? 'full exit' : `${amountEth} ETH partial withdrawal`;

  if (
    !(await confirmExecute(
      `request a ${kind} for ${pubkey} via ${ovmAddress !== undefined ? `OVM ${ovmAddress}` : 'the EOA withdrawal contract'}`,
    ))
  ) {
    return;
  }

  const client = makeClient({ signer: true });
  if (ovmAddress !== undefined) {
    // OVM: amounts are gwei strings, one per pubkey; fees are in wei for all.
    const { txHash } = await client.splits.requestWithdrawal({
      ovmAddress,
      pubKeys: [pubkey],
      amounts: [parseUnits(amountEth, 9).toString()], // ETH -> gwei
    });
    console.log('Withdrawal request tx:', txHash);
  } else {
    // EOA: `allocation` is in ETH (number); `requiredFee` (wei) is optional.
    const { txHash } = await client.eoa.requestWithdrawal({
      pubkey,
      allocation: Number(amountEth),
    });
    console.log('Withdrawal request tx:', txHash ?? '(none needed)');
  }
};

run(main);
