import { loadConfig, loadWallet, getBalance } from '../../wallet.js';
import { ConfigError } from '../../errors.js';
import { formatUSDC, truncateAddress } from '../../utils.js';
import { Chain } from '@x402apis/protocol';

export async function balanceCommand(options: any = {}): Promise<void> {
    const config = loadConfig();
    if (!config) {
        throw new ConfigError('Not initialized. Run: x402-router init');
    }

    const chain: Chain = options.chain || config.defaultChain;
    const walletPath = config.wallet[chain];

    if (!walletPath) {
        throw new ConfigError(`No wallet configured for chain: ${chain}`);
    }

    const wallet = loadWallet(walletPath);
    const address = wallet.publicKey.toString();

    console.log(`\n💰 Checking balance...\n`);
    console.log(`Chain: ${chain}`);
    console.log(`Wallet: ${truncateAddress(address)}`);

    // Get balance (The function will also log the result internally)
    const balance = await getBalance(wallet, chain);

    console.log(`\nFinal Balance: ${formatUSDC(balance)} USDC`);

    if (balance === 0) {
        console.log(`\n💡 Fund your wallet with: x402-router fund`);
    }
}