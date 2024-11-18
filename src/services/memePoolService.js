const { Connection, PublicKey } = require('@solana/web3.js');
const EventEmitter = require('events');

class MempoolService extends EventEmitter {
    constructor() {
        super();
        this.connection = new Connection('https://api.mainnet-beta.solana.com');
        this.monitoredWallets = new Set();
        this.subscription = null;
    }

    async startMonitoring() {
        if (this.subscription) return;

        this.subscription = this.connection.onLogs(
            'all',
            (logs) => {
                if (logs.err) return;

                const transaction = logs.transaction;
                if (!transaction) return;

                const accounts = transaction.message.accountKeys.map(key => key.toBase58());
                
                for (const wallet of this.monitoredWallets) {
                    if (accounts.includes(wallet)) {
                        this.emit('transaction', {
                            signature: logs.signature,
                            wallet,
                            logs: logs.logs,
                            accounts
                        });
                    }
                }
            },
            'processed'
        );
    }

    addWalletToMonitor(walletAddress) {
        this.monitoredWallets.add(walletAddress);
    }

    removeWalletFromMonitor(walletAddress) {
        this.monitoredWallets.delete(walletAddress);
    }

    async stopMonitoring() {
        if (this.subscription) {
            await this.connection.removeOnLogsListener(this.subscription);
            this.subscription = null;
        }
    }
}

module.exports = new MempoolService();