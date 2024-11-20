const EventEmitter = require('events');
const { Connection, PublicKey } = require('@solana/web3.js');

class MempoolService extends EventEmitter {
    constructor() {
        super();
        this.monitoredWallets = new Set();
        this.isMonitoring = false;
        this.connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
        this.subscriptionId = null;
    }

    addWalletToMonitor(address) {
        try {
            const publicKey = new PublicKey(address);
            this.monitoredWallets.add(publicKey.toString());
            console.log(`Added wallet to monitor: ${address}`);
            return true;
        } catch (error) {
            console.error('Error adding wallet to monitor:', error);
            return false;
        }
    }

    removeWalletFromMonitor(address) {
        try {
            const publicKey = new PublicKey(address);
            const removed = this.monitoredWallets.delete(publicKey.toString());
            if (removed) {
                console.log(`Removed wallet from monitoring: ${address}`);
            } else {
                console.log(`Wallet not found in monitoring list: ${address}`);
            }
            return removed;
        } catch (error) {
            console.error('Error removing wallet from monitor:', error);
            return false;
        }
    }

    async startMonitoring() {
        if (this.isMonitoring) return;
        
        try {
            this.isMonitoring = true;
            console.log('Starting mempool monitoring...');

            // Subscribe to all transactions
            this.subscriptionId = this.connection.onLogs(
                'all',
                (logs) => {
                    if (logs.err) return;
                    
                    // Check if transaction involves any monitored wallets
                    const involvedAddresses = new Set([
                        ...logs.logs,
                        logs.signature
                    ].map(log => {
                        try {
                            return new PublicKey(log).toString();
                        } catch {
                            return null;
                        }
                    }).filter(addr => addr !== null));

                    // Check if any monitored wallet is involved
                    const monitoredWalletInvolved = Array.from(this.monitoredWallets)
                        .some(wallet => involvedAddresses.has(wallet));

                    if (monitoredWalletInvolved) {
                        this.emit('transaction', {
                            signature: logs.signature,
                            wallet: Array.from(this.monitoredWallets)
                                .find(wallet => involvedAddresses.has(wallet))
                        });
                    }
                }
            );

            console.log('Mempool monitoring started successfully');
        } catch (error) {
            console.error('Error starting mempool monitoring:', error);
            this.isMonitoring = false;
        }
    }

    stopMonitoring() {
        if (!this.isMonitoring) return;
        
        try {
            if (this.subscriptionId !== null) {
                this.connection.removeOnLogsListener(this.subscriptionId);
                this.subscriptionId = null;
            }
            
            this.isMonitoring = false;
            console.log('Mempool monitoring stopped');
        } catch (error) {
            console.error('Error stopping mempool monitoring:', error);
        }
    }

    getMonitoredWallets() {
        return Array.from(this.monitoredWallets);
    }
}

module.exports = new MempoolService();