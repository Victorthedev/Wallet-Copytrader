const { Connection, PublicKey, Transaction } = require('@solana/web3.js');
const { Token } = require('@solana/spl-token');
const config = require('../config/config');

class SolanaHelper {
    constructor() {
        this.connection = new Connection(config.RPC_ENDPOINT);
    }

    async getTokenAccountBalance(tokenAddress, walletAddress) {
        const tokenPublicKey = new PublicKey(tokenAddress);
        const walletPublicKey = new PublicKey(walletAddress);
        
        const tokenAccounts = await this.connection.getTokenAccountsByOwner(
            walletPublicKey,
            { mint: tokenPublicKey }
        );
        
        return tokenAccounts.value[0]?.account.data.parsed.info.tokenAmount.uiAmount || 0;
    }

    async watchWalletTransactions(walletAddress, callback) {
        const publicKey = new PublicKey(walletAddress);
        
        this.connection.onAccountChange(
            publicKey,
            async (accountInfo, context) => {
                const signatures = await this.connection.getSignaturesForAddress(publicKey);
                const latestTransaction = signatures[0];
                
                const transaction = await this.connection.getTransaction(latestTransaction.signature);
                callback(transaction);
            }
        );
    }

    async executeTokenSwap(tokenAddress, amount, isbuying = true) {
        // Implementation for token swap using Jupiter or Raydium
        // This is a placeholder - actual implementation would require integration with a DEX
    }
}

module.exports = new SolanaHelper();