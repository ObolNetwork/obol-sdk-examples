/**
 * Create a cluster definition (the invite operators accept on the launchpad).
 *
 * SDK methods: preflightCreate, hasAcceptedTerms,
 * acceptObolLatestTermsAndConditions, createClusterDefinition (incl.
 * `resumeFrom`), getClusterDefinition.
 *
 * Dry run (default): runs preflightCreate (schema, operator addresses,
 * threshold, recipients, signer chain, terms) and prints the issues; nothing
 * is signed or posted. With --execute: accepts the terms if needed (EIP-712
 * signature, no transaction) and POSTs the definition to the Obol API.
 *
 *   yarn create-cluster
 *   yarn create-cluster --execute
 *   CLUSTER_NAME=… yarn create-cluster --execute --resume <configHash>
 *
 * --resume: retry after an earlier run created the definition but a later
 * step failed. If <configHash> was created by this signer from the same
 * payload, its hash is returned without signing or posting anything;
 * otherwise ResumeMismatchError lists the fields that differ. The payload must
 * be identical, so set CLUSTER_NAME (the default name has a timestamp).
 *
 * Env: PRIVATE_KEY (creator), OPERATOR_ADDRESSES (comma separated, >= 4),
 * WITHDRAWAL_ADDRESS, FEE_RECIPIENT_ADDRESS, VALIDATOR_COUNT, CLUSTER_NAME.
 */
import {
  ResumeMismatchError,
  type ClusterPayload,
} from '@obolnetwork/obol-sdk';
import {
  confirmExecute,
  getSigner,
  inviteUrl,
  makeClient,
  optionalEnv,
} from './shared/config.ts';
import { describeError, printIssues, run } from './shared/run.ts';

// Placeholder Hoodi addresses; override with OPERATOR_ADDRESSES etc.
const DEFAULT_OPERATORS = [
  '0xC35CfCd67b9C27345a54EDEcC1033F2284148c81',
  '0x33807D6F1DCe44b9C599fFE03640762A6F08C496',
  '0xc6e76F72Ea672FAe05C357157CfC37720F0aF26f',
  '0x86B8145c98e5BD25BA722645b15eD65f024a87EC',
];

const flagValue = (flag: string): string | undefined => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
};

const buildPayload = (): ClusterPayload => {
  const operators = (
    optionalEnv('OPERATOR_ADDRESSES')?.split(',') ?? DEFAULT_OPERATORS
  ).map(address => ({ address: address.trim() }));
  const validatorCount = Number(optionalEnv('VALIDATOR_COUNT') ?? '1');
  const validator = {
    withdrawal_address:
      optionalEnv('WITHDRAWAL_ADDRESS') ??
      '0xE0C5ceA4D3869F156717C66E188Ae81C80914a6e',
    fee_recipient_address:
      optionalEnv('FEE_RECIPIENT_ADDRESS') ??
      '0x3CD4958e76C317abcEA19faDd076348808424F99',
  };
  return {
    name: optionalEnv('CLUSTER_NAME') ?? `sdk-example-${Date.now()}`,
    operators,
    validators: Array.from({ length: validatorCount }, () => ({ ...validator })),
  };
};

const main = async (): Promise<void> => {
  const resumeFrom = flagValue('--resume');
  if (resumeFrom !== undefined && optionalEnv('CLUSTER_NAME') === undefined) {
    throw new Error('--resume needs the same payload as the first run: set CLUSTER_NAME.');
  }
  const payload = buildPayload();
  console.log('Payload:');
  console.dir(payload, { depth: null });

  // Read-only. With a signer it also checks the signer's chain and terms
  // acceptance; without one it reports SIGNER_REQUIRED.
  const client = makeClient({ signer: getSigner() !== undefined });
  const preflight = await client.preflightCreate(payload);
  printIssues('preflightCreate', preflight);

  if (
    !(await confirmExecute(
      resumeFrom !== undefined
        ? `resume the cluster definition ${resumeFrom}`
        : 'create this cluster definition',
    ))
  ) {
    return;
  }

  const signingClient = makeClient({ signer: true });

  // Required once per address before any API write (preflightCreate reports
  // TERMS_NOT_ACCEPTED until then). `ifNotAccepted` skips it if already done.
  const termsMessage = await signingClient.acceptObolLatestTermsAndConditions({
    ifNotAccepted: true,
  });
  console.log('Terms:', termsMessage);

  let configHash: string;
  try {
    // Runs the preflight checks again and throws PreflightFailedError (with
    // `issues`) on the ones it enforces.
    configHash = await signingClient.createClusterDefinition(payload, { resumeFrom });
  } catch (err) {
    if (err instanceof ResumeMismatchError) {
      console.error(describeError(err));
      console.error(`  differing fields: ${err.fields.join(', ') || '(creator)'}`);
      process.exitCode = 1;
      return;
    }
    throw err;
  }
  console.log(
    `${resumeFrom !== undefined ? 'Resumed' : 'Created'} definition, config_hash: ${configHash}`,
  );

  const definition = await signingClient.getClusterDefinition(configHash);
  console.log(
    `threshold ${definition.threshold}/${definition.operators.length}, ${definition.num_validators} validator(s), version ${definition.version}`,
  );
  console.log('Invite operators with:', inviteUrl(configHash));
  console.log(`Follow progress with: yarn watch-cluster ${configHash}`);
};

run(main);
