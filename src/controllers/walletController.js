const { Wallet } = require('../models/walletModel');
const TradingService = require('../services/tradingService');
const TransactionService = require('../services/transactionService');
const { Connection, PublicKey } = require('@solana/web3.js');

class WalletController {
    constructor() {
        this.tradingService = TradingService;
        this.transactionService = new TransactionService();
        this.connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');
    }

    async addWallet(req, res) {
        try {
            const { address } = req.body;

            // Validate Solana address
            try {
                new PublicKey(address);
            } catch (error) {
                return res.status(400).json({ error: 'Invalid Solana address' });
            }

            // Check if wallet already exists
            const existingWallet = await Wallet.findOne({ address });
            if (existingWallet) {
                return res.status(400).json({ error: 'Wallet already exists' });
            }

            // Get initial balance
            const publicKey = new PublicKey(address);
            const balance = await this.connection.getBalance(publicKey);

            const wallet = new Wallet({
                address,
                balance: balance / 1e9, // Convert lamports to SOL
                lastUpdated: new Date()
            });

            await wallet.save();
            res.status(201).json(wallet);
        } catch (error) {
            console.error('Error adding wallet:', error);
            res.status(500).json({ error: 'Failed to add wallet' });
        }
    }

    async getWallets(req, res) {
        try {
            const wallets = await Wallet.find().select('-transactions');
            res.json(wallets);
        } catch (error) {
            console.error('Error getting wallets:', error);
            res.status(500).json({ error: 'Failed to get wallets' });
        }
    }

    async removeWallet(req, res) {
        try {
            const { address } = req.params;
            const result = await Wallet.findOneAndDelete({ address });
            
            if (!result) {
                return res.status(404).json({ error: 'Wallet not found' });
            }

            res.json({ message: 'Wallet removed successfully' });
        } catch (error) {
            console.error('Error removing wallet:', error);
            res.status(500).json({ error: 'Failed to remove wallet' });
        }
    }

    async toggleBot(req, res) {
        try {
            const { active } = req.body;
            
            if (active) {
                await this.tradingService.startTrading();
            } else {
                await this.tradingService.stopTrading();
            }
            
            res.json({ active, message: `Bot ${active ? 'started' : 'stopped'} successfully` });
        } catch (error) {
            console.error('Error toggling bot:', error);
            res.status(500).json({ error: 'Failed to toggle bot' });
        }
    }

    async updatePurchaseAmount(req, res) {
        try {
            const { amount } = req.body;
            if (typeof amount !== 'number' || amount <= 0) {
                return res.status(400).json({ error: 'Invalid amount' });
            }
            // Implementation depends on your bot logic
            // This is just a placeholder response
            res.json({ amount });
        } catch (error) {
            console.error('Error updating purchase amount:', error);
            res.status(500).json({ error: 'Failed to update purchase amount' });
        }
    }

    async getWalletBalance(req, res) {
        try {
            const { address } = req.params;
            const publicKey = new PublicKey(address);
            const balance = await this.connection.getBalance(publicKey);
            res.json({ balance: balance / 1e9 }); // Convert lamports to SOL
        } catch (error) {
            console.error('Error getting wallet balance:', error);
            res.status(500).json({ error: 'Failed to get wallet balance' });
        }
    }
}

module.exports = new WalletController();