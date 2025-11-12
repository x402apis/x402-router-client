import inquirer from 'inquirer';
import open from 'open';
import QRCode from 'qrcode';
import { Chain } from '@x402apis/protocol';
import {
    generateWallet,
    saveWallet,
    saveConfig,
    getDefaultWalletPath,
    getBalance,
} from '../../wallet.js';
import { UserConfig } from '../../types.js';
import { sleep, truncateAddress } from '../../utils.js';

export async function initCommand(options: { chain?: Chain } = {}): Promise<void> {
    console.log('🚀 Initializing x402 Router\n');

    const chain: Chain = options.chain || 'solana';

    // 1. Create wallet
    console.log(`Creating ${chain} wallet...`);
    const wallet = generateWallet();
    const walletPath = getDefaultWalletPath(chain);
    saveWallet(wallet, walletPath);

    console.log(`✅ Created wallet: ${truncateAddress(wallet.publicKey.toString())}`);
    console.log(`🔐 Saved to: ${walletPath}\n`);

    // 2. Ask about funding
    const { fundNow } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'fundNow',
            message: '💰 Fund your wallet now?',
            default: true,
        },
    ]);

    if (fundNow) {
        await fundWallet(wallet.publicKey.toString(), chain);
    }

    // 3. Create config
    const config: UserConfig = {
        wallet: {
            [chain]: walletPath,
        },
        defaultChain: chain,
        registry: 'https://registry.x402apis.io',
        autoFund: {
            enabled: false,
            provider: 'solana',
            minBalance: 5.0,
            topUpAmount: 10.0,
        },
        preferences: {
            preferCheap: false,
            timeout: 30000,
        },
    };

    saveConfig(config);

    console.log('\n✅ Configuration saved!');
    console.log('\n🎉 Ready to go! Try:');
    console.log('   x402-router call openai.chat "Hello world"');
}

async function fundWallet(address: string, chain: Chain): Promise<void> {
    const { method } = await inquirer.prompt([
        {
            type: 'list',
            name: 'method',
            message: 'Choose funding method:',
            choices: [
                { name: '📱 Show QR code', value: 'qr' },
                { name: '📋 Copy address', value: 'copy' },
                { name: '💳 Coinbase Pay (buy with card)', value: 'coinbase' },
                { name: '⏭️  Skip for now', value: 'skip' },
            ],
        },
    ]);

    switch (method) {
        case 'qr':
            await showQRCode(address, chain);
            break;
        case 'copy':
            console.log(`\n📋 Wallet address: ${address}`);
            console.log('Send USDC to this address to fund your wallet.');
            break;
        case 'coinbase':
            await openCoinbasePay(address, chain);
            break;
        case 'skip':
            console.log('\n⏭️  Skipping funding. You can fund later with: x402-router fund');
            break;
    }
}

async function showQRCode(address: string, chain: Chain): Promise<void> {
    try {
        const qr = await QRCode.toString(address, { type: 'terminal', small: true });
        console.log('\n📱 Scan this QR code with your mobile wallet:\n');
        console.log(qr);
        console.log(`Address: ${address}`);
        console.log(`Chain: ${chain}`);
    } catch (error) {
        console.error('Failed to generate QR code:', error);
    }
}

async function openCoinbasePay(address: string, chain: Chain): Promise<void> {
    const blockchainParam = chain === 'solana' ? 'solana' : chain;
    const url = `https://pay.coinbase.com/buy?address=${address}&blockchain=${blockchainParam}&asset=USDC&amount=10`;

    console.log('\n💳 Opening Coinbase Pay...');
    await open(url);

    console.log('⏳ Waiting for payment...');
    await waitForFunds(address, chain);
}

async function waitForFunds(address: string, chain: Chain): Promise<void> {
    // TODO: Implement actual balance checking
    console.log('⏳ Checking balance every 5 seconds...');

    for (let i = 0; i < 60; i++) {
        await sleep(5000);

        // Placeholder - implement real balance check
        const balance = 0;

        if (balance > 0) {
            console.log(`\n✅ Received $${balance.toFixed(2)} USDC!`);
            return;
        }
    }

    console.log('\n⏱️  Timeout waiting for funds. Check your wallet manually.');
}