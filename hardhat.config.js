require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require('dotenv').config();

// Define networks configuration
const networks = {
  hardhat: {
    chainId: 1337
  },
  localhost: {
    url: "http://127.0.0.1:8545"
  }
};

// Only add Sepolia network if environment variables are set
if (process.env.ALCHEMY_API_KEY && process.env.PRIVATE_KEY) {
  networks.sepolia = {
    url: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
    accounts: [`0x${process.env.PRIVATE_KEY}`]
  };
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.30",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks,
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};