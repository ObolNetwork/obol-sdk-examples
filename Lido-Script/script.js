import { Client } from "@obolnetwork/obol-sdk";
import { ethers } from "ethers";
import * as fs from "fs";

// Array of clusters objects to create. Will be crafted in this try/catch by parsing the CSV of operator addresses
let clusters;

try {
  // Read the CSV file synchronously
  const data = fs.readFileSync("./data.csv", "utf8");

  // Split the CSV data into rows
  const rows = data.split("\n");

  // Extract the header row
  const headers = rows[0].split(",");

  // Initialize an array to store the parsed data
  const results = [];

  // Parse the data rows
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i].split(",");
    const rowData = {};

    for (let j = 0; j < headers.length; j++) {
      rowData[headers[j].trim()] = row[j].trim();
    }

    results.push(rowData);
  }

  // Now, the `results` array contains the parsed CSV data
  console.log(results);

  // Now craft cluster objects from the array of CSV data
  clusters = results.map((obj) => {
    return {
      name: obj.cluster_name,
      operators: [
        { address: obj.operator1 },
        { address: obj.operator2 },
        { address: obj.operator3 },
        { address: obj.operator4 },
        { address: obj.operator5 },
        { address: obj.operator6 },
        { address: obj.operator7 },
      ],
      // Holesky Lido Vaults, be sure to update for other networks
      validators: [
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
        {
          fee_recipient_address: "0xE73a3602b99f1f913e72F8bdcBC235e206794Ac8",
          withdrawal_address: "0xF0179dEC45a37423EAD4FaD5fCb136197872EAd9",
        },
      ],
    };
  });
} catch (err) {
  console.error("Error reading the file:", err);
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
    return configHash;
  } catch (err) {
    console.log(`Failed to create cluster for ${clusterConfig.name}. Error: ${err.toString()}.`);
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
