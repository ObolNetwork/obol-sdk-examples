# AGENTS.md — Obol SDK Examples

## Purpose

This repo contains runnable examples demonstrating how to use `@obolnetwork/obol-sdk`. It is the **official reference** for external developers learning the SDK API.

**Every new method added to `obol-sdk` must have a corresponding example here.**

## Repo Structure

```
TS-Example/           # TypeScript examples — primary reference (start here)
  src/<flow>.ts       # One runnable script per SDK flow (see README flows table)
  src/shared/         # config.ts (network/API/signer/--execute), run.ts (typed errors)
  .env.example
  package.json        # one npm script per flow
  tsconfig.json

JS-Example/           # One minimal plain-JS create + accept + watch flow
  index.js

Lido-Script/          # Script for creating clusters from clusters.csv
  script.js
  clusters.csv

.github/workflows/typecheck.yml   # tsc --noEmit for every example, PRs + weekly
```

**Work in `TS-Example/` only** unless explicitly asked to update the JS examples. TypeScript is the source of truth.

## Running the Examples

```bash
cd TS-Example
yarn install
yarn typecheck              # tsc --noEmit
yarn <flow> [args]          # dry run (read-only / preflight calls only)
yarn <flow> [args] --execute  # actually sign / send / write
```

Scripts run with Node's built-in type stripping (Node >= 22.18), no build step. See README for the JS example and the Lido script.

## Safety Rules

- Default network is **Hoodi (560048)** on the **non-production dev API** (`https://obol-api-nonprod-dev.dev.obol.tech`, bare origin: the SDK adds `/v1`). Mainnet only via `OBOL_NETWORK=mainnet`, which prints a loud warning.
- Anything that sends a transaction or writes to the Obol API must go through `confirmExecute()` in `src/shared/config.ts`: dry run by default, `--execute` to run. In the dry run, call the read-only / preflight SDK methods where they exist.
- Signers come from `PRIVATE_KEY` (ethers `Wallet`, via `makeClient({ signer: true })`) or the viem adapter. No `window.ethereum`, no random wallets posting to the API, no `as any` casts.
- Import from the package root (`@obolnetwork/obol-sdk`) or `@obolnetwork/obol-sdk/viem`, never from `dist/`.

## Development Workflow

When adding a new example for a new SDK method:

1. Add it to the `TS-Example/src/<flow>.ts` script for that flow, or create a new script and an npm script for it
2. Document the script with a header comment: what it demonstrates, the SDK methods, dry run vs `--execute`, usage and env vars
3. Add any new env vars to `TS-Example/.env.example` and the flow to the README flows table
4. Run `yarn typecheck`
5. Run the script in dry-run mode against Hoodi + the dev API to confirm it works

## Example Pattern

```typescript
import { confirmExecute, makeClient } from './shared/config.ts';
import { run } from './shared/run.ts';

const main = async (): Promise<void> => {
  const client = makeClient();                 // read-only
  const info = await client.someReadMethod(x); // reads / preflight run in dry run too
  console.log(info);

  if (!(await confirmExecute('do the write', payload))) return;
  const result = await makeClient({ signer: true }).someWriteMethod(payload);
  console.log(result);
};

run(main); // prints ObolApiError / ObolSdkError with status / code / hint
```

Key conventions:
- One script per flow; scripts share only `src/shared/`
- Relative imports keep the `.ts` extension; type-only imports use `import type`
- Log results with `console.log` so the output is visible when running
- Let errors reach `run()`; catch specific error classes only when the example shows how to handle them

## Client Initialization

`makeClient()` in `TS-Example/src/shared/config.ts` builds the client for the configured network:

```typescript
const provider = new JsonRpcProvider(rpcUrl, chainId, { staticNetwork: true });
const signer = new Wallet(process.env.PRIVATE_KEY, provider);
const client = new Client({ baseUrl, chainId }, signer, provider); // signer omitted for read-only
```

`src/viem-signer.ts` shows the viem path (`walletClientToSigner`, `publicClientToProvider`).

## What Belongs Here

- Usage examples for every public `Client` method
- Usage examples for every sub-module method (`client.splits.*`, `client.eoa.*`, `client.incentives.*`, `client.exit.*`)
- The `validateClusterLock` standalone export
- Different client initialization patterns (ethers signer, viem, read-only)

**Does not belong here:**
- Tests (those go in `obol-sdk/test/`)
- Production scripts with real credentials
- Internal tooling

## Keeping Examples Up to Date

When `obol-sdk` bumps a version:
1. Update the `@obolnetwork/obol-sdk` range in the `package.json` of every example
2. Run `yarn install` and `yarn typecheck` to confirm the examples still compile
3. Update any examples that use renamed or changed API methods
4. Add examples for any newly added methods

## Dependencies Policy

- Use a caret range on the latest minor (e.g. `^2.15.0`) for `@obolnetwork/obol-sdk`; no lockfiles are committed, so CI always type-checks the newest release. Never commit a `file:` / `link:` SDK path
- Keep `ethers` in sync with the version used by `obol-sdk` to avoid peer dependency conflicts
- No additional dependencies should be added unless absolutely required for an example
