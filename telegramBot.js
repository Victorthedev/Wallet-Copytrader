const { Telegraf } = require('telegraf');
const RaydiumService = require('./src/services/raydiumService');
const MempoolService = require('./src/services/memePoolService');
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const { Token } = require('@solana/spl-token');
const bs58 = require('bs58').default;

class TelegramTradingBot {
    constructor() {
        // if (!process.env.TELEGRAM_BOT_TOKEN) {
        //     throw new Error('TELEGRAM_BOT_TOKEN is not set in environment variables');
        // }
    
        this.bot = new Telegraf('7907098054:AAEV3t_G-QDEQdGwNmNOMeNrQmXRvjm-XWc');
        
        // Test connection
        this.connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
        
        // Initialize collections
        this.wallets = new Map();
        this.monitoredWallets = new Set();
        
        // Setup error handling for the bot
        this.bot.catch((err, ctx) => {
            console.error('Bot error:', err);
            ctx.reply('An error occurred while processing your request.');
        });
    
        this.setupBot();
        this.setupMempoolMonitoring();
    
        // Test connection on startup
        this.testConnection();
    }
    
    async testConnection() {
        try {
            const version = await this.connection.getVersion();
            console.log('Connected to Solana network:', version);
        } catch (error) {
            console.error('Error connecting to Solana:', error);
        }
    }

    setupBot() {
        this.bot.command('start', (ctx) => {
            ctx.reply('Hi Victor!, Use /help to see available commands.');
        });

        this.bot.command('help', (ctx) => {
            ctx.reply(
                'Available commands:\n' +
                '/connect_wallet <private_key> - Connect your wallet\n' +
                '/add_monitor <wallet_address> - Add wallet to monitor\n' +
                '/remove_monitor <wallet_address> - Remove monitored wallet\n' +
                '/list_monitored - List monitored wallets\n' +
                '/start_bot - Start copying trades\n' +
                '/stop_bot - Stop copying trades\n' +
                '/balance - Check wallet balance'
            );
        });

        this.bot.command('connect_wallet', async (ctx) => {
            try {
                const args = ctx.message.text.split(' ');
                if (args.length < 2) {
                    return ctx.reply('Please provide a private key. Usage: /connect_wallet <private_key>');
                }
        
                const privateKey = args[1];
                console.log('Attempting to connect wallet...'); // Debug log
        
                // Validate private key format
                if (privateKey.length < 32) {
                    return ctx.reply('Invalid private key format. Please provide a valid Solana private key');
                }
        
                try {
                    const decodedKey = bs58.decode(privateKey);
                    const keypair = Keypair.fromSecretKey(decodedKey);
                    
                    // Verify the keypair is valid
                    const balance = await this.connection.getBalance(keypair.publicKey);
                    console.log(`Wallet connected. Public key: ${keypair.publicKey.toString()}`); // Debug log
        
                    // Store the wallet
                    this.wallets.set(ctx.from.id, keypair);
                    
                    await ctx.reply(
                        `Wallet connected successfully!\n` +
                        `Public Key: ${keypair.publicKey.toString()}\n` +
                        `Balance: ${balance / 1000000000} SOL`
                    );
                } catch (decodeError) {
                    console.error('Private key decode error:', decodeError); // Debug log
                    return ctx.reply('Error: Invalid private key format. Please make sure you\'re providing a valid Solana private key');
                }
            } catch (error) {
                console.error('Wallet connection error:', error); // Debug log
                ctx.reply(`Error connecting wallet: ${error.message}`);
            }
        });

        this.bot.command('add_monitor', async (ctx) => {
            const address = ctx.message.text.split(' ')[1];
            if (!address) {
                return ctx.reply('Please provide a wallet address to monitor');
            }
            try {
                const publicKey = new PublicKey(address); // Validate address format
                this.monitoredWallets.add(publicKey.toString());
                const added = MempoolService.addWalletToMonitor(address);
                if (added) {
                    ctx.reply(`Now monitoring wallet: ${address}`);
                } else {
                    ctx.reply('Failed to add wallet to monitoring');
                }
            } catch (error) {
                console.error('Error adding monitor:', error);
                ctx.reply('Invalid wallet address');
            }
        });
        
        this.bot.command('remove_monitor', async (ctx) => {
            const address = ctx.message.text.split(' ')[1];
            if (!address) {
                return ctx.reply('Please provide a wallet address to remove from monitoring');
            }
            try {
                const publicKey = new PublicKey(address); // Validate address format
                this.monitoredWallets.delete(publicKey.toString());
                const removed = MempoolService.removeWalletFromMonitor(address);
                if (removed) {
                    ctx.reply(`Stopped monitoring wallet: ${address}`);
                } else {
                    ctx.reply('This wallet was not being monitored');
                }
            } catch (error) {
                console.error('Error removing monitor:', error);
                ctx.reply('Invalid wallet address');
            }
        });
        

        this.bot.command('list_monitored', (ctx) => {
            if (this.monitoredWallets.size === 0) {
                return ctx.reply('No wallets are currently being monitored');
            }
            const walletList = Array.from(this.monitoredWallets).join('\n');
            ctx.reply(`Currently monitored wallets:\n${walletList}`);
        });

        this.bot.command('balance', async (ctx) => {
            try {
                const userWallet = this.wallets.get(ctx.from.id);
                if (!userWallet) {
                    return ctx.reply('Please connect your wallet first using /connect_wallet');
                }

                const balance = await this.connection.getBalance(userWallet.publicKey);
                ctx.reply(
                    `Wallet Balance:\n` +
                    `SOL: ${balance / 1000000000}\n` +
                    `Public Key: ${userWallet.publicKey.toString()}`
                );
            } catch (error) {
                console.error('Balance check error:', error);
                ctx.reply('Error checking balance');
            }
        });

        this.bot.command('start_bot', (ctx) => {
            if (!this.wallets.has(ctx.from.id)) {
                return ctx.reply('Please connect your wallet first using /connect_wallet');
            }
            MempoolService.startMonitoring();
            ctx.reply('Bot started! Now copying trades from monitored wallets.');
        });

        this.bot.command('stop_bot', (ctx) => {
            MempoolService.stopMonitoring();
            ctx.reply('Bot stopped.');
        });
    }

    setupMempoolMonitoring() {
        MempoolService.on('transaction', async (data) => {
            const txInfo = await this.analyzePurchase(data);
            if (txInfo) {
                this.notifyAndExecuteTrades(txInfo);
            }
        });
    }

    async analyzePurchase(transactionData) {
        const { signature, wallet } = transactionData;
        
        const txInfo = await this.connection.getTransaction(signature);
        if (!txInfo) return null;

        return this.extractTokenChanges(txInfo, wallet);
    }

    async notifyAndExecuteTrades(tradeInfo) {
        const { tokenIn, tokenOut, amountIn } = tradeInfo;

        // Execute trade for all connected users
        for (const [userId, userWallet] of this.wallets.entries()) {
            try {
                const result = await RaydiumService.swap(
                    userWallet,
                    tokenIn,
                    tokenOut,
                    amountIn
                );

                if (result.success) {
                    this.bot.telegram.sendMessage(
                        userId,
                        `Trade executed!\n` +
                        `Swapped: ${amountIn} ${tokenIn.mint.toBase58()}\n` +
                        `For: ${tokenOut.mint.toBase58()}\n` +
                        `Tx: ${result.signature}\n` +
                        `Slippage used: ${result.slippage}%`
                    );
                }
            } catch (error) {
                this.bot.telegram.sendMessage(
                    userId,
                    `Trade failed: ${error.message}`
                );
            }
        }
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
            amountIn: Math.abs(tokenIn.change)
        };
    }

    start() {
        this.bot.launch();
    }
}

module.exports = new TelegramTradingBot();