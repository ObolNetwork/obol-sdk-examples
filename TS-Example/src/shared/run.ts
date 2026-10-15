/**
 * Shared error reporting and entry point for the example scripts.
 *
 * The SDK throws two families of typed errors:
 * - `ObolApiError` (and subclasses such as `NotFoundError`, `ValidationError`,
 *   `ConflictError`, `RateLimitError`) for non-2xx Obol API responses, with
 *   `status`, `method`, `endpoint`, `body` and an optional `hint`.
 * - `ObolSdkError` (and subclasses such as `ChainMismatchError`,
 *   `NotAnOperatorError`, `DepositConflictError`, `ClusterProgressTimeoutError`)
 *   for checks the SDK runs locally, with a stable `code` and a `hint`.
 *
 * Payload validation (`PayloadValidationError`, code PAYLOAD_INVALID) and
 * malformed hash / address arguments (`InvalidArgumentError`, code
 * INVALID_ARGUMENT) are ObolSdkErrors too.
 *
 * A few errors sit outside both families (`SignerRequiredError`,
 * `UnsupportedChainError`, `InvalidBaseUrlError`, `RequestTimeoutError`), so
 * they are matched by class here.
 */
import {
  InvalidBaseUrlError,
  ObolApiError,
  ObolSdkError,
  RequestTimeoutError,
  SignerRequiredError,
  UnsupportedChainError,
  type PreflightResult,
} from '@obolnetwork/obol-sdk';

/**
 * Prints a preflight result (`preflightCreate`, `preflightAccept`,
 * `incentives.preflightClaim`). Only `error` issues (the default severity)
 * make `ok` false; `warning` / `info` are advisory.
 */
export const printIssues = (label: string, result: PreflightResult): void => {
  console.log(`${label}: ${result.ok ? 'ok' : 'FAILED'}`);
  for (const issue of result.issues) {
    console.log(`  ${issue.severity ?? 'error'} [${issue.code}] ${issue.message}`);
    console.log(`    hint: ${issue.hint}`);
  }
};

/** Prints an error with the structured fields the SDK provides. */
export const describeError = (err: unknown): string => {
  if (err instanceof ObolApiError) {
    return [
      `${err.name}: ${err.message}`,
      `  HTTP ${err.status} ${err.method} ${err.endpoint}`,
      err.hint !== undefined ? `  hint: ${err.hint}` : undefined,
    ]
      .filter(Boolean)
      .join('\n');
  }
  if (err instanceof ObolSdkError) {
    return [
      `${err.name} [${err.code}]: ${err.message}`,
      err.hint !== undefined ? `  hint: ${err.hint}` : undefined,
    ]
      .filter(Boolean)
      .join('\n');
  }
  if (
    err instanceof SignerRequiredError ||
    err instanceof UnsupportedChainError ||
    err instanceof InvalidBaseUrlError ||
    err instanceof RequestTimeoutError
  ) {
    return `${err.name}: ${err.message}`;
  }
  if (err instanceof Error) {
    return `${err.name}: ${err.message}`;
  }
  return String(err);
};

/**
 * Runs an example's `main`, printing typed errors and setting a non-zero exit
 * code on failure.
 */
export const run = (main: () => Promise<void>): void => {
  main().catch((err: unknown) => {
    console.error(`\n${describeError(err)}`);
    process.exitCode = 1;
  });
};
