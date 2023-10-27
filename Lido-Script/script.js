import { Client } from "@obolnetwork/obol-sdk";
import { ethers } from "ethers";
import {clustersConfigs} from "./data.js";



const mnemonic = ethers.Wallet.createRandom().mnemonic?.phrase || "";
const privateKey = ethers.Wallet.fromPhrase(mnemonic).privateKey;
const wallet = new ethers.Wallet(privateKey);
const signer = wallet.connect(null);
const client = new Client(
  { baseUrl: "https://obol-api-dev.gcp.obol.tech", chainId: 17000 },
  signer
);


const createObolCluster = async (clusterConfig) => {
  try {
    const configHash = await client.createClusterDefinition(clusterConfig);
    return configHash;
  } catch (err) {
    console.log(err, "err");
  }
};


async function createMultipleClusters() {
  try {
    const promises = clustersConfigs.map(async (clusterConfig) => {
      return await createObolCluster(clusterConfig);
    });

    const results = await Promise.all(promises);

    console.log(results,"results"); 
  } catch (error) {
    console.error(error);
  }
}

createMultipleClusters();


