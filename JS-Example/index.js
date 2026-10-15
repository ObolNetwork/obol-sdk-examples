/**
 * Minimal plain-JavaScript Obol SDK flow: create a cluster definition, accept
 * it as an operator, and watch it until the lock is published.
 * See ../TS-Example for one script per SDK flow.
 *
 *   node index.js                 # dry run: prints what it would do, reads only
 *   node index.js --execute       # signs and writes to the Obol API
 *   CONFIG_HASH=0x… node index.js # skip creation, accept/watch an existing definition
 *
 * Defaults to Hoodi (560048) and the non-production dev Obol API. Mainnet only
 * with OBOL_NETWORK=mainnet.
 */
import {
  Client,
  ClusterProgressTimeoutError,
  ObolApiError,
  ObolSdkError,
} from "@obolnetwork/obol-sdk";
import { JsonRpcProvider, Wallet } from "ethers";

const NETWORKS = {
  hoodi: {
    chainId: 560048,
    apiUrl: "https://obol-api-nonprod-dev.dev.obol.tech",
    rpcUrl: "https://ethereum-hoodi-rpc.publicnode.com",
  },
  mainnet: {
    chainId: 1,
    apiUrl: "https://api.obol.tech",
    rpcUrl: "https://ethereum-rpc.publicnode.com",
  },
};

const env = (name) => process.env[name]?.trim() || undefined;
const EXECUTE = process.argv.includes("--execute");
const networkName = (env("OBOL_NETWORK") ?? "hoodi").toLowerCase();
const network = NETWORKS[networkName];
if (!network) throw new Error(`OBOL_NETWORK must be hoodi or mainnet`);
// The SDK wants the bare origin; it adds /v1 itself.
const apiUrl = (env("OBOL_API_URL") ?? network.apiUrl).replace(/\/v1\/?$/, "");

console.log(
  `network=${networkName} api=${apiUrl} mode=${EXECUTE ? "EXECUTE" : "dry-run"}`,
);
if (networkName === "mainnet") {
  console.warn(
    "\n!!! MAINNET: API writes go to production data. Unset OBOL_NETWORK for Hoodi. !!!\n",
  );
}

const provider = new JsonRpcProvider(
  env("RPC_URL") ?? network.rpcUrl,
  network.chainId,
  { staticNetwork: true },
);
const signer = env("PRIVATE_KEY")
  ? new Wallet(env("PRIVATE_KEY"), provider)
  : undefined;
const client = new Client(
  { baseUrl: apiUrl, chainId: network.chainId },
  signer,
  provider,
);

const clusterPayload = {
  name: env("CLUSTER_NAME") ?? `sdk-js-example-${Date.now()}`,
  operators: (
    env("OPERATOR_ADDRESSES") ??
    "0xC35CfCd67b9C27345a54EDEcC1033F2284148c81,0x33807D6F1DCe44b9C599fFE03640762A6F08C496,0xc6e76F72Ea672FAe05C357157CfC37720F0aF26f,0x86B8145c98e5BD25BA722645b15eD65f024a87EC"
  )
    .split(",")
    .map((address) => ({ address: address.trim() })),
  validators: [
    {
      withdrawal_address:
        env("WITHDRAWAL_ADDRESS") ?? "0xE0C5ceA4D3869F156717C66E188Ae81C80914a6e",
      fee_recipient_address:
        env("FEE_RECIPIENT_ADDRESS") ??
        "0x3CD4958e76C317abcEA19faDd076348808424F99",
    },
  ],
};

const requireSigner = () => {
  if (!signer) throw new Error("PRIVATE_KEY is required with --execute");
  return signer;
};

/** 1. Create the definition (or use CONFIG_HASH). */
const createCluster = async () => {
  if (!EXECUTE) {
    console.log("[dry-run] Would create:", JSON.stringify(clusterPayload, null, 2));
    return undefined;
  }
  requireSigner();
  // Once per address; skipped if already accepted.
  await client.acceptObolLatestTermsAndConditions({ ifNotAccepted: true });
  const configHash = await client.createClusterDefinition(clusterPayload);
  console.log("Created definition:", configHash);
  return configHash;
};

/** 2. Accept it as an operator (PRIVATE_KEY must be one of the operators). */
const acceptCluster = async (configHash) => {
  const summary = await client.getAcceptanceSummary(configHash);
  console.log(
    `"${summary.name}": ${summary.operators.length} operators, threshold ${summary.threshold}, withdrawals to ${summary.withdrawal_addresses.join(", ")}`,
  );
  const enr = env("OPERATOR_ENR");
  if (!enr) {
    console.log("OPERATOR_ENR not set: skipping acceptance.");
    return;
  }
  if (!EXECUTE) {
    console.log("[dry-run] Would accept with ENR", enr.slice(0, 24) + "…");
    return;
  }
  requireSigner();
  await client.acceptObolLatestTermsAndConditions({ ifNotAccepted: true });
  await client.acceptClusterDefinition({ enr }, configHash);
  console.log("Accepted.");
};

/** 3. Wait for the lock, printing progress, for at most 60 s. */
const watchCluster = async (configHash) => {
  try {
    const { lockHash } = await client.waitFor(configHash, "lock_published", {
      timeoutMs: 60_000,
      onProgress: (p) =>
        console.log(
          p.step === "awaiting_signatures"
            ? `  signatures ${p.signed}/${p.total}`
            : `  ${p.step}`,
        ),
    });
    console.log("Lock published:", lockHash);
  } catch (err) {
    if (err instanceof ClusterProgressTimeoutError) {
      console.log(`  ${err.message} (${err.hint})`);
      return;
    }
    throw err;
  }
};

const main = async () => {
  const configHash = env("CONFIG_HASH") ?? (await createCluster());
  if (!configHash) {
    console.log("[dry-run] Set CONFIG_HASH to accept/watch an existing definition.");
    return;
  }
  await acceptCluster(configHash);
  await watchCluster(configHash);
};

main().catch((err) => {
  if (err instanceof ObolApiError) {
    console.error(`${err.name} (HTTP ${err.status} ${err.method} ${err.endpoint}): ${err.message}`);
    if (err.hint) console.error(`hint: ${err.hint}`);
  } else if (err instanceof ObolSdkError) {
    console.error(`${err.name} [${err.code}]: ${err.message}`);
    if (err.hint) console.error(`hint: ${err.hint}`);
  } else {
    console.error(err);
  }
  process.exitCode = 1;
});
