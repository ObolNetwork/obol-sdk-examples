# CLAUDE.md — Obol SDK Examples

## Purpose

This repo contains runnable examples demonstrating how to use `@obolnetwork/obol-sdk`. It is the **official reference** for external developers learning the SDK API.

**Every new method added to `obol-sdk` must have a corresponding example here.**

## Repo Structure

```
TS-Example/           # TypeScript examples — primary reference (start here)
  index.ts            # All SDK usage examples in one file
  package.json
  tsconfig.json

JS-Example/           # JavaScript examples — secondary, mirrors TS-Example
  index.js
  package.json

Lido-Script/          # Script for creating clusters from clusters.csv
  script.js
  clusters.csv
```

**Work in `TS-Example/` only** unless explicitly asked to update the JS examples. TypeScript is the source of truth.

## Running the Examples

```bash
# TypeScript examples
cd TS-Example
yarn install
yarn build       # tsc compile
yarn start       # run compiled output

# JavaScript examples
cd JS-Example
yarn install
yarn start

# Lido cluster creation script
cd Lido-Script
# Update clusters.csv with your cluster config first
node script.js
```

## Development Workflow

When adding a new example for a new SDK method:

1. Open `TS-Example/index.ts`
2. Add a new async function following the existing pattern (see below)
3. Document the function with a JSDoc comment explaining what it demonstrates
4. Export or call it at the bottom of the file
5. Run `yarn build` to confirm it compiles
6. Run `yarn start` to confirm it executes without errors (use a test wallet/mock where real signing is impractical)

## Example Pattern

Follow the conventions already in `TS-Example/index.ts`:

```typescript
/**
 * Demonstrates <what this SDK method does>
 * @returns <what it returns>
 */
const exampleMethodName = async (): Promise<ReturnType> => {
  try {
    const result = await client.methodName(payload);
    console.log('Result:', result);
    return result;
  } catch (err) {
    console.log(err, 'err');
  }
};
```

Key conventions:
- Each example is a standalone async function — no shared state between examples
- Use the shared `client` instance already set up at the top of the file
- Log the result with `console.log` so the output is visible when running
- Wrap in try/catch and log errors — examples should not crash the whole file
- Add a JSDoc `@returns` line describing what a successful call produces

## Client Initialization (already at top of file)

The file uses a randomly generated wallet for examples that require a signer:

```typescript
const mnemonic = ethers.Wallet.createRandom().mnemonic?.phrase || "";
const privateKey = ethers.Wallet.fromPhrase(mnemonic).privateKey;
const wallet = new ethers.Wallet(privateKey);
const signer = wallet.connect(null);
const client = new Client({ baseUrl: "https://api.obol.tech", chainId: 1 }, signer as any);
```

There are also helper functions at the top showing how to initialize with:
- A browser provider (`window.ethereum`) + signer
- A provider only (no signer, read-only)
- Neither provider nor signer (public endpoints only)

When demonstrating a method that needs a specific initialization pattern, reference the appropriate helper.

## What Belongs Here

- Usage examples for every public `Client` method
- Usage examples for every sub-module method (`client.splits.*`, `client.eoa.*`, `client.incentives.*`, `client.exit.*`)
- The `validateClusterLock` standalone export
- Different client initialization patterns (browser, Node.js, read-only)

**Does not belong here:**
- Tests (those go in `obol-sdk/test/`)
- Production scripts with real credentials
- Internal tooling

## Keeping Examples Up to Date

When `obol-sdk` bumps a version:
1. Update the `@obolnetwork/obol-sdk` version in `TS-Example/package.json`
2. Run `yarn install` and `yarn build` to confirm the examples still compile
3. Update any examples that use renamed or changed API methods
4. Add examples for any newly added methods

## Dependencies Policy

- Keep `@obolnetwork/obol-sdk` pinned to the **exact latest stable version** in `package.json`
- Keep `ethers` in sync with the version used by `obol-sdk` to avoid peer dependency conflicts
- No additional dependencies should be added unless absolutely required for an example
