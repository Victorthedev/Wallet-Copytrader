const express = require('express');
const connectDB = require('./config/database');
const walletController = require('./controllers/walletController');
const transactionController = require('./controllers/transactionController');
require('dotenv').config();

const app = express();

// Connect to database
connectDB();

// Middleware
app.use(express.json());
app.use(express.static('frontend'));

// Wallet routes
app.post('/api/wallets', walletController.addWallet.bind(walletController));
app.get('/api/wallets', walletController.getWallets.bind(walletController));
app.delete('/api/wallets/:address', walletController.removeWallet.bind(walletController));
app.get('/api/wallets/:address/balance', walletController.getWalletBalance.bind(walletController));
app.post('/api/bot/toggle', walletController.toggleBot.bind(walletController));
app.put('/api/settings/amount', walletController.updatePurchaseAmount.bind(walletController));

// Transaction routes
app.post('/api/transactions', transactionController.createTransaction.bind(transactionController));
app.get('/api/transactions/:address', transactionController.getTransactions.bind(transactionController));
app.get('/api/transaction/:signature', transactionController.getTransaction.bind(transactionController));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});