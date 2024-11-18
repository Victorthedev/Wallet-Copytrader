const WalletModel = require('../models/WalletModel');
const solanaHelper = require('../utils/solanaHelper');
const config = require('../config/config');

class WalletService {
    constructor() {
        this.isActive = false;
        this.watchedWallets = new Map();
    }

    async addWalletToWatch(walletAddress) {
        try {
            const wallet = await WalletModel.create({ address: walletAddress });
            this.startWatchingWallet(walletAddress);
            return wallet;
        } catch (error) {
            throw new Error(`Failed to add wallet: ${error.message}`);
        }
    }

    async removeWalletFromWatch(walletAddress) {
        try {
            await WalletModel.deleteOne({ address: walletAddress });
            this.watchedWallets.delete(walletAddress);
            return true;
        } catch (error) {
            throw new Error(`Failed to remove wallet: ${error.message}`);
        }
    }

    startWatchingWallet(walletAddress) {
        if (this.watchedWallets.has(walletAddress)) return;

        const callback = async (transaction) => {
            if (!this.isActive) return;
            
            // Process transaction and execute copy trade
            await this.processCopyTrade(transaction, walletAddress);
        };

        solanaHelper.watchWalletTransactions(walletAddress, callback);
        this.watchedWallets.set(walletAddress, true);
    }

    async processCopyTrade(transaction, sourceWalletAddress) {
        // Extract token address and transaction type from the transaction
        const tokenAddress = this.extractTokenAddress(transaction);
        const isBuyTransaction = this.isBuyTransaction(transaction);

        if (isBuyTransaction) {
            await solanaHelper.executeTokenSwap(tokenAddress, config.DEFAULT_PURCHASE_AMOUNT, true);
        } else {
            await solanaHelper.executeTokenSwap(tokenAddress, config.DEFAULT_PURCHASE_AMOUNT, false);
        }
    }

    toggleBot(status) {
        this.isActive = status;
        return this.isActive;
    }

    // Helper methods
    extractTokenAddress(transaction) {
        // Implementation to extract token address from transaction
    }

    isBuyTransaction(transaction) {
        // Implementation to determine if transaction is a buy
    }
}

module.exports = new WalletService();