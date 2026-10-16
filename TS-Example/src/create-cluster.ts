/**
 * Create a cluster definition (the invite operators accept on the launchpad).
 *
 * SDK methods: hasAcceptedTerms, acceptObolLatestTermsAndConditions,
 * createClusterDefinition, getClusterDefinition.
 *
 * Dry run (default): prints the payload and, with PRIVATE_KEY set, whether the
 * signer has accepted the terms; nothing is signed or posted. With --execute:
 * accepts the terms if needed (EIP-712 signature, no transaction) and POSTs
 * the definition to the Obol API.
 *
 *   yarn create-cluster
 *   yarn create-cluster --execute
 *
 * Env: PRIVATE_KEY (creator), OPERATOR_ADDRESSES (comma separated, >= 4),
 * WITHDRAWAL_ADDRESS, FEE_RECIPIENT_ADDRESS, VALIDATOR_COUNT, CLUSTER_NAME.
 */
import type { ClusterPayload } from '@obolnetwork/obol-sdk';
import {
  confirmExecute,
  getSigner,
  inviteUrl,
  makeClient,
  optionalEnv,
} from './shared/config.ts';
import { run } from './shared/run.ts';

// Placeholder Hoodi addresses; override with OPERATOR_ADDRESSES etc.
const DEFAULT_OPERATORS = [
  '0xC35CfCd67b9C27345a54EDEcC1033F2284148c81',
  '0x33807D6F1DCe44b9C599fFE03640762A6F08C496',
  '0xc6e76F72Ea672FAe05C357157CfC37720F0aF26f',
  '0x86B8145c98e5BD25BA722645b15eD65f024a87EC',
];

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
  const payload = buildPayload();
  console.log('Payload:');
  console.dir(payload, { depth: null });

  if (getSigner() !== undefined) {
    // Read-only: the terms must be accepted once per address before any API write.
    const accepted = await makeClient({ signer: true }).hasAcceptedTerms();
    console.log(`Terms accepted by the signer: ${accepted}`);
  }

  if (!(await confirmExecute('create this cluster definition'))) {
    return;
  }

  const signingClient = makeClient({ signer: true });

  // `ifNotAccepted` skips the signature if the terms are already accepted.
  const termsMessage = await signingClient.acceptObolLatestTermsAndConditions({
    ifNotAccepted: true,
  });
  console.log('Terms:', termsMessage);

  // Validates the payload locally first (PayloadValidationError: fewer than 4
  // operators, malformed or duplicate addresses, ...); an identical existing
  // definition is a ConflictError.
  const configHash = await signingClient.createClusterDefinition(payload);
  console.log(`Created definition, config_hash: ${configHash}`);

  const definition = await signingClient.getClusterDefinition(configHash);
  console.log(
    `threshold ${definition.threshold}/${definition.operators.length}, ${definition.num_validators} validator(s), version ${definition.version}`,
  );
  console.log('Invite operators with:', inviteUrl(configHash));
};

run(main);
