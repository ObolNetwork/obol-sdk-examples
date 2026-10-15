/**
 * Voluntary exits for a distributed validator. Read-only: nothing is sent to
 * the Obol API or the chain. Broadcasting the resulting exit is up to you
 * (e.g. POST it to a beacon node's /eth/v1/beacon/pool/voluntary_exits).
 *
 * SDK methods: exit.validateExitBlobs (which also runs
 * exit.verifyExitPayloadSignature and exit.verifyPartialExitSignature),
 * exit.recombineExitBlobs.
 *
 *   yarn exits recombine <exit-blob.json>
 *   yarn exits validate <lockHash> <partial-exits.json> [existing-blob.json]
 *
 * - `recombine` aggregates the operators' partial exit signatures for one
 *   validator into a full signed exit. Input: ExistingExitValidationBlobData
 *   ({ public_key, epoch, validator_index, shares_exit_data: [{ "<shareIdx>":
 *   { partial_exit_signature } }] }), the shape the Obol API stores partial
 *   exits in.
 * - `validate` checks an operator's partial exits payload (what
 *   `charon exit sign` submits: { partial_exits, share_idx, signature })
 *   against the cluster lock, using a beacon node for the genesis root.
 */
import { readFileSync } from 'node:fs';
import type {
  ClusterLock,
  ExistingExitValidationBlobData,
  ExitClusterConfig,
  ExitValidationPayload,
} from '@obolnetwork/obol-sdk';
import { args, config, makeClient } from './shared/config.ts';
import { run } from './shared/run.ts';

const readJson = <T>(path: string): T =>
  JSON.parse(readFileSync(path, 'utf8')) as T;

/** The subset of a cluster lock that exit validation needs. */
const toExitClusterConfig = (lock: ClusterLock): ExitClusterConfig => ({
  definition: {
    operators: lock.cluster_definition.operators.map(o => ({ enr: o.enr ?? '' })),
    fork_version: lock.cluster_definition.fork_version,
    threshold: lock.cluster_definition.threshold,
  },
  distributed_validators: lock.distributed_validators,
});

const main = async (): Promise<void> => {
  const [command, ...rest] = args();
  const client = makeClient();

  if (command === 'recombine' && rest[0] !== undefined) {
    const blob = readJson<ExistingExitValidationBlobData>(rest[0]);
    const exit = await client.exit.recombineExitBlobs(blob);
    console.log('Signed voluntary exit:');
    console.log(JSON.stringify(exit, null, 2));
    return;
  }

  if (command === 'validate' && rest[0] !== undefined && rest[1] !== undefined) {
    const lock = await client.getClusterLockByHash(rest[0]);
    const payload = readJson<ExitValidationPayload>(rest[1]);
    const existing =
      rest[2] !== undefined ? readJson<ExistingExitValidationBlobData>(rest[2]) : null;

    // Throws on a bad operator signature, unknown pubkey, bad partial
    // signature or an epoch that does not move forward; returns the partial
    // exits that are new.
    const accepted = await client.exit.validateExitBlobs(
      toExitClusterConfig(lock),
      payload,
      config.beaconUrl,
      existing,
    );
    console.log(`${accepted.length} new valid partial exit(s) from share ${payload.share_idx}:`);
    for (const blob of accepted) {
      console.log(
        `  ${blob.public_key.slice(0, 18)}… epoch ${blob.signed_exit_message.message.epoch}`,
      );
    }
    return;
  }

  throw new Error(
    'Usage: yarn exits recombine <exit-blob.json> | yarn exits validate <lockHash> <partial-exits.json> [existing-blob.json]',
  );
};

run(main);
