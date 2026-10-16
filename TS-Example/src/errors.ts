/**
 * Typed error handling. Read-only: every case fails before or at a GET, and
 * nothing is signed or sent.
 *
 * SDK error families:
 * - ObolApiError: the Obol API answered with a non-2xx status. Has `status`,
 *   `method`, `endpoint`, `body` and maybe a `hint`. Subclasses:
 *   NotFoundError (404), ValidationError (400/422), UnauthorizedError
 *   (401/403), ConflictError (409), RateLimitError (429).
 * - ObolSdkError: a local check failed. Has a stable `code` and a `hint`.
 *   Subclasses include PayloadValidationError (PAYLOAD_INVALID, with the AJV
 *   `errors`), InvalidArgumentError (INVALID_ARGUMENT, with `argument`),
 *   ChainMismatchError, DefinitionVerificationError, NotAnOperatorError,
 *   IncentivesPreflightError and TransactionSubmissionError.
 * - Standalone classes: InvalidBaseUrlError, UnsupportedChainError,
 *   SignerRequiredError, RequestTimeoutError.
 *
 *   yarn errors
 */
import {
  ChainMismatchError,
  Client,
  InvalidArgumentError,
  PayloadValidationError,
  ConflictError,
  NotFoundError,
  ObolApiError,
  ObolSdkError,
  RateLimitError,
  type ClusterPayload,
} from '@obolnetwork/obol-sdk';
import { Wallet } from 'ethers';
import { config, getProvider, makeClient } from './shared/config.ts';
import { describeError, run } from './shared/run.ts';

const attempt = async (label: string, fn: () => unknown): Promise<void> => {
  try {
    await fn();
    console.log(`${label}: no error`);
  } catch (err) {
    console.log(`\n${label}\n  ${describeError(err).replace(/\n/g, '\n  ')}`);

    // Branch on the class (or `code`), not on message text.
    if (err instanceof NotFoundError) {
      console.log('  -> treat as "does not exist (yet)"');
    } else if (err instanceof ConflictError) {
      console.log('  -> the resource already exists');
    } else if (err instanceof RateLimitError) {
      console.log('  -> back off and retry');
    } else if (err instanceof ObolApiError) {
      console.log(`  -> other API error, status ${err.status}`);
    } else if (err instanceof PayloadValidationError) {
      console.log(`  -> ${err.code}: ${err.errors.length} schema error(s), first at "${err.errors[0]?.instancePath}"`);
    } else if (err instanceof InvalidArgumentError) {
      console.log(`  -> ${err.code}: fix the "${err.argument}" argument`);
    } else if (err instanceof ChainMismatchError) {
      console.log(
        `  -> switch the wallet to chain ${err.expectedChainId} (it is on ${err.actualChainId})`,
      );
    } else if (err instanceof ObolSdkError) {
      console.log(`  -> local check failed, code ${err.code}`);
    }
  }
};

const VALID_PAYLOAD: ClusterPayload = {
  name: 'errors-example',
  operators: [
    { address: '0xC35CfCd67b9C27345a54EDEcC1033F2284148c81' },
    { address: '0x33807D6F1DCe44b9C599fFE03640762A6F08C496' },
    { address: '0xc6e76F72Ea672FAe05C357157CfC37720F0aF26f' },
    { address: '0x86B8145c98e5BD25BA722645b15eD65f024a87EC' },
  ],
  validators: [
    {
      fee_recipient_address: '0x3CD4958e76C317abcEA19faDd076348808424F99',
      withdrawal_address: '0xE0C5ceA4D3869F156717C66E188Ae81C80914a6e',
    },
  ],
};

const main = async (): Promise<void> => {
  const client = makeClient();

  // 404 from the API -> NotFoundError (an ObolApiError).
  await attempt('getClusterDefinition(unknown config hash)', () =>
    client.getClusterDefinition(`0x${'00'.repeat(31)}01`),
  );

  // Hash / address arguments are checked before any request is sent
  // (InvalidArgumentError, code INVALID_ARGUMENT).
  await attempt('getClusterLock("not-a-hash")', () =>
    client.getClusterLock('not-a-hash'),
  );

  // Writes without a signer -> SignerRequiredError.
  await attempt('createClusterDefinition without a signer', () =>
    client.createClusterDefinition(VALID_PAYLOAD),
  );

  // A throwaway wallet on this network, given to a client for the *other*
  // network: every write below fails locally, before anything is signed or
  // posted. (The provider has a static network, so no RPC call either.)
  const throwaway = Wallet.createRandom(getProvider());
  const otherChainId = config.chainId === 1 ? 560048 : 1;
  const mismatched = new Client(
    { baseUrl: config.apiUrl, chainId: otherChainId },
    throwaway,
  );

  // Methods with a payload validate it locally (AJV) before anything else:
  // PayloadValidationError, code PAYLOAD_INVALID.
  await attempt('splits.requestWithdrawal with an empty payload', () =>
    mismatched.splits.requestWithdrawal({ ovmAddress: '0x0', pubKeys: [], amounts: [] }),
  );

  // createClusterDefinition validates the payload before signing: fewer than
  // 4 operators is a PayloadValidationError.
  await attempt('createClusterDefinition with 3 operators', () =>
    mismatched.createClusterDefinition({
      ...VALID_PAYLOAD,
      operators: VALID_PAYLOAD.operators.slice(0, 3),
    }),
  );

  // Signer on a different chain than the client -> ChainMismatchError.
  await attempt(
    `createClusterDefinition: client on chain ${otherChainId}, wallet on ${config.chainId}`,
    () => mismatched.createClusterDefinition(VALID_PAYLOAD),
  );

  // Only the official Obol API URLs -> InvalidBaseUrlError.
  await attempt('new Client({ baseUrl: "https://example.com" })', () =>
    new Client({ baseUrl: 'https://example.com', chainId: config.chainId }),
  );

  // Unknown chains -> UnsupportedChainError (use Hoodi or Mainnet).
  // (`chainId` is typed as the FORK_MAPPING enum; a chain ID read from
  // config is a plain number, which TypeScript accepts.)
  const holesky: number = 17000;
  await attempt('new Client({ chainId: 17000 }) (Holesky, removed)', () =>
    new Client({ baseUrl: config.apiUrl, chainId: holesky }),
  );
};

run(main);
