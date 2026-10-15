/**
 * Follow a cluster from operator sign-off to lock publication. Read-only.
 *
 * SDK methods: watchCluster, waitFor.
 *
 *   yarn watch-cluster <configHash>                 # watch for 60 s
 *   WATCH_TIMEOUT_MS=0 yarn watch-cluster <hash>    # watch until the lock is published
 *
 * Env: WATCH_TIMEOUT_MS (default 60000; 0 = no timeout).
 */
import {
  ClusterProgressTimeoutError,
  type ClusterProgress,
} from '@obolnetwork/obol-sdk';
import { args, makeClient, optionalEnv, requireEnv } from './shared/config.ts';
import { describeError, run } from './shared/run.ts';

const describe = (p: ClusterProgress): string => {
  switch (p.step) {
    case 'awaiting_signatures':
      return `awaiting signatures ${p.signed}/${p.total}; pending: ${p.pending.join(', ')}`;
    case 'definition_ready':
      return 'all operators signed; ready for the DKG';
    case 'lock_published':
      return `lock published: ${p.lockHash}`;
  }
};

const main = async (): Promise<void> => {
  const configHash = args()[0] ?? requireEnv('CONFIG_HASH');
  const timeoutMs = Number(optionalEnv('WATCH_TIMEOUT_MS') ?? '60000');
  const client = makeClient();

  // 1. watchCluster: an async iterator that yields the current state, then
  //    every change, and ends after `lock_published`. Stop it with a signal.
  console.log('watchCluster:');
  const signal = timeoutMs > 0 ? AbortSignal.timeout(timeoutMs) : undefined;
  try {
    for await (const progress of client.watchCluster(configHash, { signal })) {
      console.log(`  ${new Date().toISOString()} ${describe(progress)}`);
    }
  } catch (err) {
    if (signal?.aborted !== true) throw err;
    console.log(`  stopped after ${timeoutMs} ms`);
  }

  // 2. waitFor: resolve once a target step is reached. Here we wait for the
  //    definition to be fully signed, with a short timeout.
  console.log('waitFor(definition_ready):');
  try {
    await client.waitFor(configHash, 'definition_ready', {
      timeoutMs: Math.min(timeoutMs || 10_000, 10_000),
      onProgress: p => {
        console.log(`  ${describe(p)}`);
      },
    });
    console.log('  definition is ready (or already locked)');
  } catch (err) {
    if (err instanceof ClusterProgressTimeoutError) {
      // ObolSdkError: stable `code` plus a `hint` on what to do next.
      console.log(`  ${describeError(err)}`);
      return;
    }
    throw err;
  }
};

run(main);
