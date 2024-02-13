import { Client } from "@obolnetwork/obol-sdk";
import { ethers } from "ethers";
import * as fs from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import pkg from "papaparse";
const { parse } = pkg;

//save results in csv
const __dirname = dirname(fileURLToPath(import.meta.url));
const headers = "cluster_name,invite\n";
const filePath = join(__dirname, "invites.csv");
const writeStream = fs.createWriteStream(filePath);
writeStream.write(headers);

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
  const parsedClusters = await parseCSV("clusters.csv");

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

// Use a dummy creator address
const mnemonic = ethers.Wallet.createRandom().mnemonic?.phrase || "";
const privateKey = ethers.Wallet.fromPhrase(mnemonic).privateKey;
const wallet = new ethers.Wallet(privateKey);
const signer = wallet.connect(null);

// Setup SDK for holesky, make sure to change withdrawal credentials and fee recipient if you change the network/chainId!
const client = new Client(
  { baseUrl: "https://api.obol.tech", chainId: 17000 },
  signer
);

// Create one cluster at a time
const createObolCluster = async (clusterConfig) => {
  try {
    const configHash = await client.createClusterDefinition(clusterConfig);
    console.log(
      `${clusterConfig.name}: https://holesky.launchpad.obol.tech/dv?configHash=${configHash}`
    );
    writeStream.write(
      `${clusterConfig.name},https://holesky.launchpad.obol.tech/dv?configHash=${configHash}\n`
    );
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

    const promises = clusters.map(async (clusterConfig) => {
      return await createObolCluster(clusterConfig);
    });

    const results = await Promise.all(promises);

    console.log(results, "results");

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
