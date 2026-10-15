/**
 * Accept (join) a cluster definition as one of its operators.
 *
 * SDK methods: getAcceptanceSummary, preflightAccept, acceptClusterDefinition.
 *
 * Dry run (default): fetches and verifies the definition and prints what the
 * operator would agree to (withdrawal / fee recipients, threshold), then runs
 * preflightAccept (definition, operator membership, earlier acceptance, ENR
 * decoding and reuse, signer chain, terms). Nothing is signed.
 * With --execute: accepts the terms if needed, re-runs preflightAccept, and
 * only if it passes signs the config hash and ENR (EIP-712, no transaction)
 * and submits them to the Obol API.
 *
 *   yarn accept-cluster <configHash>
 *   yarn accept-cluster <configHash> --execute
 *
 * Env: PRIVATE_KEY (must be one of the operators), OPERATOR_ENR (the charon
 * node's ENR, from `charon enr`), OPERATOR_ADDRESS (dry run without a key:
 * the operator address to check).
 */
import {
  args,
  confirmExecute,
  getSigner,
  makeClient,
  optionalEnv,
  requireEnv,
} from './shared/config.ts';
import { printIssues, run } from './shared/run.ts';

const main = async (): Promise<void> => {
  const configHash = args()[0] ?? requireEnv('CONFIG_HASH');
  const readClient = makeClient();

  // Verified locally: config hash recomputed, network matches the client.
  const summary = await readClient.getAcceptanceSummary(configHash);
  console.log(`Cluster "${summary.name}" (${summary.version})`);
  // Charon-created definitions have no creator or operator addresses.
  const list = (xs: string[]): string =>
    xs.some(x => x !== '') ? xs.join(', ') : '(none: created with charon)';
  console.log(`  creator:     ${summary.creator_address || '(none)'}`);
  console.log(`  threshold:   ${summary.threshold}/${summary.operators.length}`);
  console.log(`  validators:  ${summary.num_validators}`);
  console.log(`  withdrawals: ${summary.withdrawal_addresses.join(', ')}`);
  console.log(`  fees:        ${summary.fee_recipient_addresses.join(', ')}`);
  console.log(`  operators:   ${list(summary.operators)}`);

  const signer = getSigner();
  const enr = optionalEnv('OPERATOR_ENR');
  const address = (await signer?.getAddress()) ?? optionalEnv('OPERATOR_ADDRESS');
  if (enr !== undefined && address !== undefined) {
    // Read-only: no signer is needed when `address` is given.
    const preflight = await makeClient().preflightAccept(configHash, { enr, address });
    printIssues(`preflightAccept for ${address}`, preflight);
  } else {
    console.log('Set OPERATOR_ENR and PRIVATE_KEY (or OPERATOR_ADDRESS) to run preflightAccept.');
  }

  if (!(await confirmExecute('sign and submit this operator acceptance'))) {
    return;
  }

  const operatorEnr = requireEnv('OPERATOR_ENR', 'Get it from `charon enr`.');
  const client = makeClient({ signer: true });
  // The API requires the terms first; preflightAccept reports
  // TERMS_NOT_ACCEPTED until then.
  await client.acceptObolLatestTermsAndConditions({ ifNotAccepted: true });

  const preflight = await client.preflightAccept(configHash, { enr: operatorEnr });
  if (!preflight.ok) {
    printIssues('preflightAccept', preflight);
    console.error('Not signing: fix the errors above first.');
    process.exitCode = 1;
    return;
  }

  // `version` is optional: the SDK takes it from the definition. It runs the
  // same checks (NotAnOperatorError, PreflightFailedError, ...) and is
  // idempotent if this operator already accepted with the same ENR.
  const updated = await client.acceptClusterDefinition({ enr: operatorEnr }, configHash);
  const signed = updated.operators.filter(
    o => o.config_signature !== undefined && o.config_signature !== '',
  ).length;
  console.log(`Accepted. ${signed}/${updated.operators.length} operators signed.`);
};

run(main);
