/**
 * Fetch a cluster lock and validate it locally. Read-only.
 *
 * SDK methods: getClusterLockByHash, getClusterLock (by config hash),
 * validateClusterLock (standalone export).
 *
 *   yarn validate-lock <lockHash>
 *   yarn validate-lock --config-hash <configHash>
 *
 * validateClusterLock checks the operator ENR/config signatures, the lock and
 * config hashes, the BLS aggregate and every deposit / builder registration
 * signature. Passing it is necessary but not sufficient for charon, which
 * applies more runtime rules. It is CPU-bound: large locks take seconds to a
 * minute.
 */
import { validateClusterLock, type ClusterLock } from '@obolnetwork/obol-sdk';
import { config, makeClient, optionalEnv } from './shared/config.ts';
import { run } from './shared/run.ts';

const main = async (): Promise<void> => {
  const args = process.argv.slice(2);
  const client = makeClient();

  let lock: ClusterLock;
  const configHashIdx = args.indexOf('--config-hash');
  if (configHashIdx !== -1) {
    lock = await client.getClusterLock(args[configHashIdx + 1] ?? '');
  } else {
    const lockHash = args[0] ?? optionalEnv('LOCK_HASH');
    if (lockHash === undefined) {
      throw new Error(
        'Usage: yarn validate-lock <lockHash> | --config-hash <configHash>',
      );
    }
    lock = await client.getClusterLockByHash(lockHash);
  }

  const def = lock.cluster_definition;
  console.log(`Lock ${lock.lock_hash}`);
  console.log(`  cluster:    ${def.name} (${def.version}, fork ${def.fork_version})`);
  console.log(`  operators:  ${def.operators.length}, threshold ${def.threshold}`);
  console.log(`  validators: ${lock.distributed_validators.length}`);

  const started = Date.now();
  // The second argument is an RPC URL, only needed when operators signed with
  // a Safe (smart contract) wallet.
  const valid = await validateClusterLock(lock, config.rpcUrl);
  console.log(`  valid:      ${valid} (${Date.now() - started} ms)`);
  if (!valid) process.exitCode = 2;
};

run(main);
