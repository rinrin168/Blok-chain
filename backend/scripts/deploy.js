/**
 * Deploy script — deploys CertificateRegistry.sol to Ethereum Sepolia.
 * Run: node scripts/deploy.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Contract ABI and bytecode (compile with solc or hardhat first)
// For demo, we include the ABI inline and expect bytecode in contracts/
const CONTRACT_PATH = path.join(__dirname, '..', '..', 'contracts', 'CertificateRegistry.sol');

async function deploy() {
  const rpcUrl    = process.env.ETHEREUM_RPC_URL;
  const privKey   = process.env.DEPLOYER_PRIVATE_KEY;

  if (!rpcUrl || !privKey) {
    console.error('[DEPLOY] Missing ETHEREUM_RPC_URL or DEPLOYER_PRIVATE_KEY in .env');
    console.log('[DEPLOY] Tip: Get free Sepolia ETH from https://sepoliafaucet.com/');
    process.exit(1);
  }

  console.log('[DEPLOY] Connecting to Sepolia...');
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet   = new ethers.Wallet(privKey, provider);
  const balance  = await provider.getBalance(wallet.address);

  console.log('[DEPLOY] Deployer:', wallet.address);
  console.log('[DEPLOY] Balance :', ethers.formatEther(balance), 'ETH');

  if (balance === 0n) {
    console.error('[DEPLOY] Wallet has no ETH. Get test ETH from https://sepoliafaucet.com/');
    process.exit(1);
  }

  // NOTE: You need to compile the contract first.
  // Option 1: Use Remix IDE → compile → export ABI + bytecode
  // Option 2: Install hardhat: npm install --save-dev hardhat and run npx hardhat compile
  // Then replace the placeholders below with actual ABI and bytecode.

  console.log('[DEPLOY] ────────────────────────────────────────────────');
  console.log('[DEPLOY] To deploy the contract:');
  console.log('[DEPLOY] 1. Open https://remix.ethereum.org');
  console.log('[DEPLOY] 2. Create a new file: CertificateRegistry.sol');
  console.log('[DEPLOY] 3. Paste the contract source from contracts/CertificateRegistry.sol');
  console.log('[DEPLOY] 4. Compile with Solidity 0.8.20');
  console.log('[DEPLOY] 5. Deploy to Injected Provider (MetaMask + Sepolia)');
  console.log('[DEPLOY] 6. Copy the deployed address to .env as CONTRACT_ADDRESS');
  console.log('[DEPLOY] ────────────────────────────────────────────────');
  console.log('[DEPLOY] Alternatively, install hardhat and run:');
  console.log('[DEPLOY]   npx hardhat compile');
  console.log('[DEPLOY]   npx hardhat run scripts/deploy.js --network sepolia');
}

deploy().catch(console.error);
