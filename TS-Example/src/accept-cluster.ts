/**
 * Accept (join) a cluster definition as one of its operators.
 *
 * SDK methods: getClusterDefinition, acceptClusterDefinition.
 *
 * Dry run (default): fetches the definition and prints what the operator
 * would agree to (withdrawal / fee recipients, threshold). Nothing is signed.
 * With --execute: accepts the terms if needed, then signs the config hash and
 * ENR (EIP-712, no transaction) and submits them to the Obol API.
 *
 *   yarn accept-cluster <configHash>
 *   yarn accept-cluster <configHash> --execute
 *
 * Env: PRIVATE_KEY (must be one of the operators), OPERATOR_ENR (the charon
 * node's ENR, from `charon enr`).
 */
import {
  args,
  confirmExecute,
  makeClient,
  requireEnv,
} from './shared/config.ts';
import { run } from './shared/run.ts';

const main = async (): Promise<void> => {
  const configHash = args()[0] ?? requireEnv('CONFIG_HASH');
  const readClient = makeClient();

  // Show the operator what they are agreeing to before signing.
  const definition = await readClient.getClusterDefinition(configHash);
  console.log(`Cluster "${definition.name}" (${definition.version})`);
  // Charon-created definitions have no creator or operator addresses.
  const list = (xs: string[]): string =>
    xs.some(x => x !== '') ? xs.join(', ') : '(none: created with charon)';
  const unique = (xs: string[]): string[] => [...new Set(xs)];
  console.log(`  creator:     ${definition.creator.address || '(none)'}`);
  console.log(`  threshold:   ${definition.threshold}/${definition.operators.length}`);
  console.log(`  validators:  ${definition.num_validators}`);
  console.log(
    `  withdrawals: ${unique(definition.validators.map(v => v.withdrawal_address)).join(', ')}`,
  );
  console.log(
    `  fees:        ${unique(definition.validators.map(v => v.fee_recipient_address)).join(', ')}`,
  );
  console.log(`  operators:   ${list(definition.operators.map(o => o.address))}`);

  if (!(await confirmExecute('sign and submit this operator acceptance'))) {
    return;
  }

  const operatorEnr = requireEnv('OPERATOR_ENR', 'Get it from `charon enr`.');
  const client = makeClient({ signer: true });
  // The API requires the terms first.
  await client.acceptObolLatestTermsAndConditions({ ifNotAccepted: true });

  // `version` is optional: the SDK takes it from the definition. It verifies
  // the definition (DefinitionVerificationError), checks the signer is an
  // operator (NotAnOperatorError), and is idempotent if this operator already
  // accepted with the same ENR.
  const updated = await client.acceptClusterDefinition({ enr: operatorEnr }, configHash);
  const signed = updated.operators.filter(
    o => o.config_signature !== undefined && o.config_signature !== '',
  ).length;
  console.log(`Accepted. ${signed}/${updated.operators.length} operators signed.`);
};

run(main);
