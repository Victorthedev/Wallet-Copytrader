const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
    address: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    balance: {
        type: Number,
        default: 0
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    transactions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction'
    }]
});

const transactionSchema = new mongoose.Schema({
    fromAddress: {
        type: String,
        required: true
    },
    toAddress: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    signature: {
        type: String,
        required: true,
        unique: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'failed'],
        default: 'pending'
    }
});

const Wallet = mongoose.model('Wallet', walletSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = { Wallet, Transaction };