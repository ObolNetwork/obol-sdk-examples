![Obol Logo](https://obol.tech/obolnetwork.png)

<h1 align="center">Obol SDK Examples</h1>

Runnable examples for [`@obolnetwork/obol-sdk`](https://www.npmjs.com/package/@obolnetwork/obol-sdk) (2.15+), one script per flow.

- **`TS-Example/`**: TypeScript, one script per SDK flow (start here).
- **`JS-Example/`**: one plain-JavaScript create → accept flow.
- **`Lido-Script/`**: create many cluster definitions from `clusters.csv`.

## Safe defaults

- Every example targets **Hoodi (chain 560048)** and the **non-production dev Obol API** (`https://obol-api-nonprod-dev.dev.obol.tech`) unless you change it.
- **Mainnet** is only used when you set `OBOL_NETWORK=mainnet`; the scripts then print a loud warning (and pause 5 s before sending anything).
- Scripts that sign, send transactions or write to the Obol API do a **dry run by default**: they run the read-only calls and print what they would do. Pass **`--execute`** to do it for real.
- Signers come from `PRIVATE_KEY` (an ethers `Wallet`). Use a throwaway Hoodi key.

## Running the TypeScript examples

Requires Node.js ≥ 22.18. Scripts run directly with Node's built-in TypeScript support, so there is no build step.

```bash
cd TS-Example
yarn install
cp .env.example .env     # optional: PRIVATE_KEY, addresses, RPC / beacon URLs
yarn typecheck           # tsc --noEmit

# read-only
yarn validate-lock 0x95081c8be316a80b764fab288e178b0cf087740718c2974aeaca7298c8621786
yarn errors

# writes: dry run first, then --execute
yarn create-cluster
yarn create-cluster --execute
```

Positional arguments go after the script name, for example `yarn deposits <lockHash> --execute`.

### Flows

| Script | Flow | SDK methods | Writes? |
|--------|------|-------------|---------|
| `yarn create-cluster` | Accept the terms and create a cluster definition (invite) | `hasAcceptedTerms`, `acceptObolLatestTermsAndConditions`, `createClusterDefinition`, `getClusterDefinition` | API (`--execute`) |
| `yarn accept-cluster <configHash>` | Review the definition, then join as an operator | `getClusterDefinition`, `acceptClusterDefinition` | API (`--execute`) |
| `yarn validate-lock <lockHash>` / `--config-hash <hash>` | Fetch a lock and verify it locally | `getClusterLockByHash`, `getClusterLock`, `validateClusterLock` | No |
| `yarn deposits <lockHash> [--assume-top-up]` | Verified deposit data from a lock, then deposit (top-ups with `kind: 'topUp'`) | `getDepositData`, `eoa.deposit` / `splits.deposit` | Chain (`--execute`) |
| `yarn withdrawal <pubkey> [amountEth]` | EIP-7002 partial withdrawal or full exit from an EOA or OVM | `getWithdrawalRequestFee`, `eoa.requestWithdrawal`, `splits.requestWithdrawal` | Chain (`--execute`) |
| `yarn splits:rewards [--legacy]` | Principal to one address, rewards split | `splits.createValidatorManagerAndRewardsSplit`; legacy `createObolRewardsSplit`, `getOWRTranches` | Chain (`--execute`) |
| `yarn splits:total [--legacy]` | Principal and rewards split | `splits.createValidatorManagerAndTotalSplit`; legacy `createObolTotalSplit` | Chain (`--execute`) |
| `yarn incentives [address]` | Check (`NO_INCENTIVES` etc.) and claim OBOL incentives, including for another address | `incentives.getIncentivesByAddress`, `isClaimed`, `preflightClaim`, `claimIncentives` | Chain (`--execute`) |
| `yarn exits recombine <blob.json>` / `validate <lockHash> <payload.json>` | Recombine partial exits; validate an operator's partial exits | `exit.recombineExitBlobs`, `exit.validateExitBlobs` | No |
| `yarn errors` | Typed error handling (`ObolApiError` / `ObolSdkError`, `code`, `hint`) | `NotFoundError`, `InvalidArgumentError`, `PayloadValidationError`, `ChainMismatchError`, … | No |

All configuration is in `TS-Example/.env.example`; the shared client setup is in `TS-Example/src/shared/config.ts`.

## Running the JavaScript example

```bash
cd JS-Example
yarn install
yarn start                                    # dry run
CONFIG_HASH=0x… yarn start                    # accept an existing definition
yarn start --execute                          # create (and accept, if OPERATOR_ENR is set)
```

## Running the Lido script

Creates one cluster definition per row of `clusters.csv` and writes the invite links to `invites.csv`. All validators in a cluster get the same configuration.

```bash
cd Lido-Script
yarn install
yarn start:dev                  # dry run: Hoodi on the dev API
yarn start:dev --execute        # create on the dev API (dev.launchpad.obol.org)
yarn start:hoodi --execute      # Hoodi on the production API (hoodi.launchpad.obol.org)
yarn start:mainnet --execute    # Mainnet: check the addresses in clusters.csv first
```

Set `PRIVATE_KEY` to create the clusters from a known address; otherwise a throwaway creator key is used.

### Cluster configuration schema

| column                | type    |
|-----------------------|---------|
| cluster_name          | string  |
| withdrawal_address    | Address |
| fee_recipient_address | Address |
| validator_count       | number  |
| operator1             | Address |
| operator2             | Address |
| operator3             | Address |
| operator4             | Address |
| ...                   | ...     |
| operatorN             | Address |

## CI

`.github/workflows/typecheck.yml` installs each example with the latest published SDK that matches its `package.json` range and runs `tsc --noEmit`, on every pull request and weekly. No lockfiles are committed, so each run tests the newest release.
