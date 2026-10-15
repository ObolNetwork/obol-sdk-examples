import { Client } from "@obolnetwork/obol-sdk";
import { ethers } from "ethers";
import * as fs from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import pkg from "papaparse";

// Usage: node script.js <dev|hoodi|mainnet> [--execute]
// - dev:     Hoodi (560048) on the non-production dev Obol API (default; safe to test)
// - hoodi:   Hoodi on the production Obol API (real invites on hoodi.launchpad.obol.org)
// - mainnet: Mainnet on the production Obol API
// Without --execute the script only prints the clusters it would create.
const ENVIRONMENTS = {
  dev: {
    chainId: 560048,
    baseUrl: "https://obol-api-nonprod-dev.dev.obol.tech",
    launchpadUrl: "https://dev.launchpad.obol.org",
  },
  hoodi: {
    chainId: 560048,
    baseUrl: "https://api.obol.tech",
    launchpadUrl: "https://hoodi.launchpad.obol.org",
  },
  mainnet: {
    chainId: 1,
    baseUrl: "https://api.obol.tech",
    launchpadUrl: "https://launchpad.obol.org",
  },
};

const envName = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "dev";
const ENVIRONMENT = ENVIRONMENTS[envName];
if (!ENVIRONMENT) {
  console.error(
    `Unknown environment "${envName}". Use one of: ${Object.keys(ENVIRONMENTS).join(", ")}`,
  );
  process.exit(1);
}
const EXECUTE = process.argv.includes("--execute");
console.log(
  `environment=${envName} chainId=${ENVIRONMENT.chainId} api=${ENVIRONMENT.baseUrl} mode=${EXECUTE ? "EXECUTE" : "dry-run"}`,
);
if (envName === "mainnet" && process.env.OBOL_NETWORK !== "mainnet") {
  console.error(
    "Refusing to use mainnet without OBOL_NETWORK=mainnet (use `yarn start:mainnet`)."
  );
  process.exit(1);
}
if (envName === "mainnet") {
  console.warn(
    "\n!!! MAINNET: clusters are created on the production Obol API for mainnet. !!!\n" +
      "!!! Check withdrawal and fee recipient addresses in clusters.csv first.  !!!\n",
  );
}

const inviteUrl = (configHash) =>
  `${ENVIRONMENT.launchpadUrl}/dv?configHash=${configHash}`;

const { parse } = pkg;

// Function to parse CSV file
function parseCSV(filePath) {
  const csvData = fs.readFileSync(filePath, "utf8");
  return new Promise((resolve) => {
    parse(csvData, {
      header: true,
      complete: (results) => {
        resolve(results.data);
      },
    });
  });
}

async function constructClustersFromCSV() {
  const parsedClusters = (await parseCSV("clusters.csv")).filter(
    (row) => row.cluster_name
  );

  let clusters = [];

  // Assume that each operator CSV row includes a cluster name
  for (const row of parsedClusters) {
    const newCluster = {
      name: row.cluster_name,
      operators: [],
      validators: [],
    };

    // Add validators
    for (let i = 0; i < parseInt(row.validator_count, 10); i++) {
      newCluster.validators.push({
        fee_recipient_address: row.fee_recipient_address,
        withdrawal_address: row.withdrawal_address,
      });
    }

    Object.keys(row).forEach((key) => {
      if (key.startsWith("operator") && row[key]) {
        newCluster.operators.push({ address: row[key] });
      }
    });

    clusters.push(newCluster);
  }
  console.log(clusters, "clusters");
  return clusters;
}

// The creator only signs the definition; it holds no funds. Use PRIVATE_KEY to
// create the clusters from a known address, otherwise a throwaway key is used.
const signer = process.env.PRIVATE_KEY
  ? new ethers.Wallet(process.env.PRIVATE_KEY)
  : ethers.Wallet.createRandom();

// Make sure withdrawal and fee recipient addresses in clusters.csv match the network!
const client = new Client(
  { baseUrl: ENVIRONMENT.baseUrl, chainId: ENVIRONMENT.chainId },
  signer
);

// Create one cluster at a time
const createObolCluster = async (clusterConfig) => {
  try {
    const configHash = await client.createClusterDefinition(clusterConfig);
    console.log(`${clusterConfig.name}: ${inviteUrl(configHash)}`);
    return configHash;
  } catch (err) {
    console.log(
      `Failed to create cluster for ${
        clusterConfig.name
      }. Error: ${err.toString()}.`
    );
    throw new Error(err);
  }
};

// Create all clusters. Should consider graceful retrying here if the number of clusters is too large.
async function createMultipleClusters() {
  try {
    const clusters = await constructClustersFromCSV();
    if (!EXECUTE) {
      console.log(
        `[dry-run] Would create ${clusters.length} cluster(s) as ${await signer.getAddress()}. Re-run with --execute.`
      );
      return;
    }

    //save results in csv
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const headers = "cluster_name,invite\n";
    const filePath = join(__dirname, "invites.csv");
    const writeStream = fs.createWriteStream(filePath);
    writeStream.write(headers);

    //accept Obol latest terms and conditions before cluster creation/acceptance
    await client.acceptObolLatestTermsAndConditions({ ifNotAccepted: true });

    for (let i = 0; i < clusters.length; i++) {
      const clusterConfig = clusters[i];
      const configHash = await createObolCluster(clusterConfig);
      writeStream.write(
        `${clusterConfig.name},${inviteUrl(configHash)}\n`
      );
    }

    writeStream.end();
    writeStream.on("finish", () => {
      console.log(`CSV file has been written to ${filePath}`);
    });
    writeStream.on("error", (err) => {
      console.error("An error occurred:", err);
    });
  } catch (error) {
    console.error(error);
  }
}

createMultipleClusters();
