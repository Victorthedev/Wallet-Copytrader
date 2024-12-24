const { Transaction } = require('../models/walletModel');
const TransactionService = require('../services/transactionService');

class TransactionController {
    constructor() {
        this.transactionService = new TransactionService();
    }

    async createTransaction(req, res) {
        try {
            const { fromAddress, toAddress, amount } = req.body;
            
            const transaction = await this.transactionService.createAndSendTransaction(
                fromAddress,
                toAddress,
                amount
            );

            res.status(201).json(transaction);
        } catch (error) {
            console.error('Error creating transaction:', error);
            res.status(500).json({ error: 'Failed to create transaction' });
        }
    }

    async getTransactions(req, res) {
        try {
            const { address } = req.params;
            const transactions = await Transaction.find({
                $or: [{ fromAddress: address }, { toAddress: address }]
            }).sort({ timestamp: -1 });

            res.json(transactions);
        } catch (error) {
            console.error('Error getting transactions:', error);
            res.status(500).json({ error: 'Failed to get transactions' });
        }
    }

    async getTransaction(req, res) {
        try {
            const { signature } = req.params;
            const transaction = await Transaction.findOne({ signature });

            if (!transaction) {
                return res.status(404).json({ error: 'Transaction not found' });
            }

            res.json(transaction);
        } catch (error) {
            console.error('Error getting transaction:', error);
            res.status(500).json({ error: 'Failed to get transaction' });
        }
    }
}

module.exports = new TransactionController();