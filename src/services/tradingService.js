const RaydiumService = require('../services/raydiumService');
const MempoolService = require('../services/memePoolService');
const { Wallet } = require('../models/walletModel');
const { Connection, PublicKey } = require('@solana/web3.js');
const { Token } = require('@solana/spl-token');

class TradingService {
    constructor() {
        this.connection = new Connection('https://api.mainnet-beta.solana.com');
        this.isActive = false;
        this.setupMempoolMonitoring();
    }

    setupMempoolMonitoring() {
        MempoolService.on('transaction', async (data) => {
            if (!this.isActive) return;
            await this.analyzePurchase(data);
        });
    }

    async analyzePurchase(transactionData) {
        const { signature, wallet, logs } = transactionData;
        
        const txInfo = await this.connection.getTransaction(signature);
        if (!txInfo) return;

        const tokenChanges = this.extractTokenChanges(txInfo, wallet);
        if (!tokenChanges) return;

        const { tokenIn, tokenOut, amountIn, amountOut } = tokenChanges;
        
        if (this.isProfitableOpportunity(amountIn, amountOut)) {
            await this.executeCopyTrade(tokenIn, tokenOut, amountIn);
        }
    }

    async executeCopyTrade(tokenIn, tokenOut, amount) {
        const wallets = await Wallet.find({ isActive: true });
        
        for (const wallet of wallets) {
            try {
                const result = await RaydiumService.swap(
                    wallet,
                    tokenIn,
                    tokenOut,
                    amount
                );
                
                if (result.success) {
                    await this.recordSuccessfulTrade({
                        wallet: wallet.address,
                        tokenIn,
                        tokenOut,
                        amount,
                        signature: result.signature
                    });
                }
            } catch (error) {
                console.error(`Trade failed for wallet ${wallet.address}:`, error);
            }
        }
    }

    isProfitableOpportunity(amountIn, amountOut) {
        const minProfitPercentage = 2;
        const estimatedProfit = ((amountOut - amountIn) / amountIn) * 100;
        return estimatedProfit >= minProfitPercentage;
    }

    extractTokenChanges(transaction, walletAddress) {
        const preTokenBalances = transaction.meta.preTokenBalances;
        const postTokenBalances = transaction.meta.postTokenBalances;
        
        const changes = postTokenBalances.map(post => {
            const pre = preTokenBalances.find(
                pre => pre.accountIndex === post.accountIndex
            );
            
            return {
                mint: post.mint,
                change: post.uiTokenAmount.uiAmount - 
                        (pre ? pre.uiTokenAmount.uiAmount : 0)
            };
        });

        const tokenIn = changes.find(c => c.change < 0);
        const tokenOut = changes.find(c => c.change > 0);

        if (!tokenIn || !tokenOut) return null;

        return {
            tokenIn: { mint: new PublicKey(tokenIn.mint) },
            tokenOut: { mint: new PublicKey(tokenOut.mint) },
            amountIn: Math.abs(tokenIn.change),
            amountOut: tokenOut.change
        };
    }

    async recordSuccessfulTrade(tradeDetails) {
        const wallet = await Wallet.findOne({ address: tradeDetails.wallet });
        if (!wallet) return;

        wallet.transactions.push({
            signature: tradeDetails.signature,
            tokenIn: tradeDetails.tokenIn.mint.toBase58(),
            tokenOut: tradeDetails.tokenOut.mint.toBase58(),
            amount: tradeDetails.amount,
            timestamp: new Date()
        });

        await wallet.save();
    }

    async startTrading() {
        this.isActive = true;
        await MempoolService.startMonitoring();
        
        const wallets = await Wallet.find({ isActive: true });
        wallets.forEach(wallet => {
            MempoolService.addWalletToMonitor(wallet.address);
        });
    }

    async stopTrading() {
        this.isActive = false;
        await MempoolService.stopMonitoring();
    }
}

module.exports = new TradingService();