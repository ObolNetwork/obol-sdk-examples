import { Client } from "@obolnetwork/obol-sdk";
import { ethers } from "ethers";
import * as fs from "fs";
import pkg from "papaparse";
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

// Function to construct the clusters JSON from parsed CSV data
async function constructClustersFromCSV(operatorsFilePath, validatorsFilePath) {
  const operators = await parseCSV(operatorsFilePath);
  const validators = await parseCSV(validatorsFilePath);

  let clusters = {};

  // Assume that each operator CSV row includes a cluster name
  for (const op of operators) {
    if (!clusters[op.cluster_name]) {
      clusters[op.cluster_name] = {
        name: op.cluster_name,
        operators: [],
        validators: [],
      };
    }
    clusters[op.cluster_name].operators.push({ address: op.address });
  }

  // Assume that each validator CSV row includes a cluster name
  for (const val of validators) {
    if (clusters[val.cluster_name]) {
      clusters[val.cluster_name].validators.push({
        fee_recipient_address: val.fee_recipient_address,
        withdrawal_address: val.withdrawal_address,
      });
    }
  }

  return Object.values(clusters); // Convert the object into an array
}

// Convert CSV files to clusters array
const clusters = await constructClustersFromCSV(
  "operators.csv",
  "validators.csv"
);

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
    const promises = clusters.map(async (clusterConfig) => {
      return await createObolCluster(clusterConfig);
    });

    const results = await Promise.all(promises);

    console.log(results, "results");
  } catch (error) {
    console.error(error);
  }
}

createMultipleClusters();
