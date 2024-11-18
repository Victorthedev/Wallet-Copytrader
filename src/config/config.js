require('dotenv').config();

module.exports = {
    SOLANA_NETWORK: process.env.SOLANA_NETWORK || 'mainnet-beta',
    RPC_ENDPOINT: process.env.RPC_ENDPOINT,
    DATABASE_URL: process.env.DATABASE_URL,
    DEFAULT_PURCHASE_AMOUNT: 5, // in USD
    SLIPPAGE_TOLERANCE: 0.5, // 0.5%
    POLLING_INTERVAL: 1000, // 1 second
};