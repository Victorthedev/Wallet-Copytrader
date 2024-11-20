const { Connection, PublicKey, Transaction, sendAndConfirmTransaction } = require('@solana/web3.js');
const { Market } = require('@raydium-io/raydium-sdk');
const { Token } = require('@solana/spl-token');

class RaydiumService {
    constructor() {
        this.connection = new Connection('https://api.mainnet-beta.solana.com');
        this.marketCache = new Map();
    }

    async getMarket(tokenAMint, tokenBMint) {
        const marketKey = `${tokenAMint}-${tokenBMint}`;
        
        if (!this.marketCache.has(marketKey)) {
            const market = await Market.load(
                this.connection,
                new PublicKey('srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX'),
                {},
                new PublicKey('CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C')
            );
            this.marketCache.set(marketKey, market);
        }
        
        return this.marketCache.get(marketKey);
    }

    async swap(wallet, tokenIn, tokenOut, amountIn, maxSlippage = 0.5) {
        let currentSlippage = maxSlippage;
        let success = false;
        
        while (currentSlippage <= 5 && !success) {
            try {
                const market = await this.getMarket(tokenIn.mint, tokenOut.mint);
                const transaction = new Transaction();
                
                const swapInstruction = await market.makeSwapTransaction(
                    this.connection,
                    {
                        owner: wallet.publicKey,
                        tokenIn: tokenIn.mint,
                        tokenOut: tokenOut.mint,
                        amountIn,
                        amountOut: 0,
                        slippage: currentSlippage
                    }
                );
                
                transaction.add(swapInstruction);
                
                const signature = await sendAndConfirmTransaction(
                    this.connection,
                    transaction,
                    [wallet]
                );
                
                success = true;
                return { success: true, signature, slippage: currentSlippage };
            } catch (error) {
                if (error.message.includes('slippage')) {
                    currentSlippage += 0.5;
                } else {
                    throw error;
                }
            }
        }
        
        return { success: false, error: 'Max slippage exceeded' };
    }
}

module.exports = new RaydiumService();