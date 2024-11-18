const { Connection, PublicKey, Transaction, SystemProgram } = require('@solana/web3.js');
const { Transaction: TransactionModel } = require('../models/walletModel');

class TransactionService {
    constructor() {
        this.connection = new Connection(
            process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
        );
    }

    async createAndSendTransaction(fromAddress, toAddress, amount) {
        try {
            const fromPubKey = new PublicKey(fromAddress);
            const toPubKey = new PublicKey(toAddress);

            // Create transaction
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: fromPubKey,
                    toPubkey: toPubKey,
                    lamports: amount * 1e9, // Convert SOL to lamports
                })
            );

            // Get the latest blockhash
            const { blockhash } = await this.connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = fromPubKey;

            // Send transaction
            const signature = await this.connection.sendTransaction(transaction, []);

            // Create transaction record
            const transactionRecord = new TransactionModel({
                fromAddress,
                toAddress,
                amount,
                signature,
                status: 'pending'
            });

            await transactionRecord.save();

            // Confirm transaction
            const confirmation = await this.connection.confirmTransaction(signature);
            
            if (confirmation.value.err) {
                transactionRecord.status = 'failed';
                await transactionRecord.save();
                throw new Error('Transaction failed');
            }

            transactionRecord.status = 'confirmed';
            await transactionRecord.save();

            return transactionRecord;
        } catch (error) {
            console.error('Transaction error:', error);
            throw error;
        }
    }

    async getTransactionStatus(signature) {
        try {
            const status = await this.connection.getSignatureStatus(signature);
            return status;
        } catch (error) {
            console.error('Error getting transaction status:', error);
            throw error;
        }
    }
}

module.exports = TransactionService;