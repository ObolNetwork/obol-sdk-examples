/**
 * ============================================================================
 * SETUP INSTRUCTIONS
 * ============================================================================
 * 
 * Before running this script:
 * 1. Copy .env.example to .env:
 *    cp .env.example .env
 * 
 * 2. Edit .env and add your PRIVATE_KEY:
 *    PRIVATE_KEY=your_private_key_here
 * 
 * 3. Run the script:
 *    yarn test:splits
 * 
 * ============================================================================
 */

import { ethers, JsonRpcProvider } from 'ethers';
import { Client } from '@obolnetwork/obol-sdk';
import dotenv from 'dotenv';

dotenv.config();

// ============================================================================
// CONSTANTS
// ============================================================================

// Network Configuration
const CHAIN_ID = 560048; // Hoodi
const BASE_URL = 'https://obol-api-nonprod-dev.dev.obol.tech';
const RPC_URL = 'https://ethereum-hoodi-rpc.publicnode.com';

// Cluster Names
const CLUSTER_NAME_REWARDS_SPLIT = 'testOVMRewardsSplit';
const CLUSTER_NAME_TOTAL_SPLIT = 'testOVMTotalSplit';

// Cluster Configuration
const NUM_VALIDATORS = 3;
const NUM_OPERATORS = 4;

// OVM Rewards Split Configuration
// Note: Percentages must sum to 99% (not 100%) because RAF automatically adds 1%
const REWARDS_SPLIT_CONFIG = {
  rewardSplitRecipients: [
    { address: '0x28eC4c075DF60535DDE5e2788C34B1961c99474c', percentAllocation: 24 },
    { address: '0x86B8145c98e5BD25BA722645b15eD65f024a87EC', percentAllocation: 30 },
    { address: '0x23563acaef1e6052fd537b7d3367fad9d026faab', percentAllocation: 20 },
    { address: '0xc2e1C75E8A9893A7388bFA9374d2207e1079Ee20', percentAllocation: 25 },
    // Removed 1% recipient - RAF automatically adds 1%, so total must be 99% (99% + 1% = 100%)
  ],
  OVMOwnerAddress: '0xc2e1C75E8A9893A7388bFA9374d2207e1079Ee20',
  principalRecipient: '0x28eC4c075DF60535DDE5e2788C34B1961c99474c',
  distributorFeePercent: 0,
};

// OVM Total Split Configuration
// Note: Reward split percentages must sum to 99% (not 100%) because RAF automatically adds 1%
// Principal split recipients sum to 100% (no RAF added to principal)
const TOTAL_SPLIT_CONFIG = {
  rewardSplitRecipients: [
    { address: '0x28eC4c075DF60535DDE5e2788C34B1961c99474c', percentAllocation: 24 },
    { address: '0x86B8145c98e5BD25BA722645b15eD65f024a87EC', percentAllocation: 30 },
    { address: '0x23563acaef1e6052fd537b7d3367fad9d026faab', percentAllocation: 20 },
    { address: '0xc2e1C75E8A9893A7388bFA9374d2207e1079Ee20', percentAllocation: 25 },
    // Removed 1% recipient - RAF automatically adds 1%, so total must be 99% (99% + 1% = 100%)
  ],
  principalSplitRecipients: [
    { address: '0x28eC4c075DF60535DDE5e2788C34B1961c99474c', percentAllocation: 25 },
    { address: '0x86B8145c98e5BD25BA722645b15eD65f024a87EC', percentAllocation: 30 },
    { address: '0x23563acaef1e6052fd537b7d3367fad9d026faab', percentAllocation: 20 },
    { address: '0xc2e1C75E8A9893A7388bFA9374d2207e1079Ee20', percentAllocation: 25 },
    // Principal split recipients sum to 100% (no RAF added to principal)
  ],
  OVMOwnerAddress: '0x86B8145c98e5BD25BA722645b15eD65f024a87EC',
  distributorFeePercent: 0,
};

// ============================================================================
// CLIENT SETUP
// ============================================================================

function setupClient(): { client: Client; signer: ethers.Wallet } {
  const privateKey = process.env.PRIVATE_KEY?.startsWith('0x')
    ? process.env.PRIVATE_KEY
    : process.env.PRIVATE_KEY ? '0x' + process.env.PRIVATE_KEY : undefined;

  if (!privateKey) {
    throw new Error('PRIVATE_KEY environment variable is required');
  }

  const provider = new JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(privateKey, provider);
  const signer = wallet.connect(provider);

  const client = new Client(
    {
      baseUrl: BASE_URL,
      chainId: CHAIN_ID,
    },
    signer as any,
  );

  return { client, signer };
}

// ============================================================================
// OVM AND SPLIT CREATION
// ============================================================================

async function createRewardsSplit(client: Client) {
  console.log('Creating OVM and Rewards Split...');
  
  const result = await client.splits.createValidatorManagerAndRewardsSplit({
    ...REWARDS_SPLIT_CONFIG,
    splitOwnerAddress: REWARDS_SPLIT_CONFIG.OVMOwnerAddress,
  });

  console.log('✓ Rewards Split OVM created:');
  console.log(`  Withdrawal Address (OVM): ${result.withdrawal_address}`);
  console.log(`  Fee Recipient (Splitter): ${result.fee_recipient_address}`);

  return result;
}

async function createTotalSplit(client: Client) {
  console.log('Creating OVM and Total Split...');
  
  const result = await client.splits.createValidatorManagerAndTotalSplit({
    ...TOTAL_SPLIT_CONFIG,
    splitOwnerAddress: TOTAL_SPLIT_CONFIG.OVMOwnerAddress,
  });

  console.log('✓ Total Split OVM created:');
  console.log(`  Withdrawal Address (OVM): ${result.withdrawal_address}`);
  console.log(`  Fee Recipient (Splitter): ${result.fee_recipient_address}`);

  return result;
}

// ============================================================================
// CLUSTER DEFINITION CREATION
// ============================================================================

async function createRewardsSplitCluster(
  client: Client,
  ovmAddress: string,
  splitterAddress: string,
): Promise<string> {
  console.log(`\nCreating cluster definition: ${CLUSTER_NAME_REWARDS_SPLIT}...`);

  // Create operators array with empty addresses for solo cluster
  const operators = Array.from({ length: NUM_OPERATORS }, () => ({
    address: '',
  }));

  // Create validators array - all validators use the same OVM and splitter addresses
  const validators = Array.from({ length: NUM_VALIDATORS }, () => ({
    withdrawal_address: ovmAddress,
    fee_recipient_address: splitterAddress,
  }));

  const clusterConfig = {
    name: CLUSTER_NAME_REWARDS_SPLIT,
    operators,
    validators,
  };

  const configHash = await client.createClusterDefinition(clusterConfig);
  console.log(`✓ Cluster definition created with config hash: ${configHash}`);

  return configHash;
}

async function createTotalSplitCluster(
  client: Client,
  ovmAddress: string,
  splitterAddress: string,
): Promise<string> {
  console.log(`\nCreating cluster definition: ${CLUSTER_NAME_TOTAL_SPLIT}...`);

  // Create operators array with empty addresses for solo cluster
  const operators = Array.from({ length: NUM_OPERATORS }, () => ({
    address: '',
  }));

  // Create validators array - all validators use the same OVM and splitter addresses
  const validators = Array.from({ length: NUM_VALIDATORS }, () => ({
    withdrawal_address: ovmAddress,
    fee_recipient_address: splitterAddress,
  }));

  const clusterConfig = {
    name: CLUSTER_NAME_TOTAL_SPLIT,
    operators,
    validators,
  };

  const configHash = await client.createClusterDefinition(clusterConfig);
  console.log(`✓ Cluster definition created with config hash: ${configHash}`);

  return configHash;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  try {
    console.log('🚀 Starting cluster creation on Hoodi (Chain ID: ' + CHAIN_ID + ')\n');

    const { client, signer } = setupClient();
    const signerAddress = await signer.getAddress();
    console.log(`Using signer: ${signerAddress}\n`);

    // Step 1: Create OVM and splits
    const rewardsSplitResult = await createRewardsSplit(client);
    const totalSplitResult = await createTotalSplit(client);

    // Step 2: Create cluster definitions
    const rewardsConfigHash = await createRewardsSplitCluster(
      client,
      rewardsSplitResult.withdrawal_address,
      rewardsSplitResult.fee_recipient_address,
    );

    const totalConfigHash = await createTotalSplitCluster(
      client,
      totalSplitResult.withdrawal_address,
      totalSplitResult.fee_recipient_address,
    );

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('✅ SUCCESS - All clusters created!');
    console.log('='.repeat(80));
    console.log('\nRewards Split Cluster:');
    console.log(`  Name: ${CLUSTER_NAME_REWARDS_SPLIT}`);
    console.log(`  Config Hash: ${rewardsConfigHash}`);
    console.log(`  OVM Address: ${rewardsSplitResult.withdrawal_address}`);
    console.log(`  Splitter Address: ${rewardsSplitResult.fee_recipient_address}`);
    console.log(`  Validators: ${NUM_VALIDATORS}`);
    console.log(`  Operators: ${NUM_OPERATORS}`);

    console.log('\nTotal Split Cluster:');
    console.log(`  Name: ${CLUSTER_NAME_TOTAL_SPLIT}`);
    console.log(`  Config Hash: ${totalConfigHash}`);
    console.log(`  OVM Address: ${totalSplitResult.withdrawal_address}`);
    console.log(`  Splitter Address: ${totalSplitResult.fee_recipient_address}`);
    console.log(`  Validators: ${NUM_VALIDATORS}`);
    console.log(`  Operators: ${NUM_OPERATORS}`);
    console.log('');
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Export functions for potential reuse
export {
  setupClient,
  createRewardsSplit,
  createTotalSplit,
  createRewardsSplitCluster,
  createTotalSplitCluster,
};

// Run if executed directly
main();
