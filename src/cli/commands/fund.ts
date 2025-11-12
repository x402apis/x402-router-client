import inquirer from 'inquirer';
import open from 'open';
import QRCode from 'qrcode';
import { Keypair } from '@solana/web3.js';
import { loadConfig, loadWallet, getBalance } from '../../wallet.js'; // Added getBalance
import { ConfigError } from '../../errors.js';
import { formatUSDC, truncateAddress, sleep } from '../../utils.js';
import { Chain } from '@x402apis/protocol';

/**
 * Main command handler for funding the wallet
 */
export async function fundCommand(options: any = {}): Promise<void> {
    const config = loadConfig();
    if (!config) {
        throw new ConfigError('Not initialized. Run: x402-router init');
    }

    const chain: Chain = options.chain || config.defaultChain;
    const walletPath = config.wallet[chain];

    if (!walletPath) {
        throw new ConfigError(`No wallet configured for chain: ${chain}`);
    }

    // Load wallet
    const wallet = loadWallet(walletPath);
    const address = wallet.publicKey.toString();

    // Get actual current balance
    const currentBalance = await getBalance(wallet, chain);

    // Show current balance
    console.log(`\n💰 Current balance: ${formatUSDC(currentBalance)} USDC`);
    console.log(`📍 Wallet: ${truncateAddress(address)}\n`);

    const { method } = await inquirer.prompt([
        {
            type: 'list',
            name: 'method',
            message: 'Choose funding method:',
            choices: [
                { name: '📱 Show QR code', value: 'qr' },
                { name: '📋 Copy address', value: 'copy' },
                { name: '💳 Coinbase Pay (buy with card)', value: 'coinbase' },
            ],
        },
    ]);

    switch (method) {
        case 'qr':
            await showQRCode(address, chain);
            break;
        case 'copy':
            await copyAddress(address, chain);
            break;
        case 'coinbase':
            // Pass the wallet object to openCoinbasePay
            await openCoinbasePay(wallet, chain, options.amount || 10);
            break;
    }
}

/**
 * Show QR code for wallet address
 */
async function showQRCode(address: string, chain: Chain): Promise<void> {
    try {
        const qr = await QRCode.toString(address, { type: 'terminal', small: true });
        console.log('\n📱 Scan this QR code with your mobile wallet:\n');
        console.log(qr);
        console.log(`\nAddress: ${address}`);
        console.log(`Chain: ${chain}`);
        console.log(`Asset: USDC\n`);
        console.log('💡 Tip: Send USDC to this address to fund your wallet');
    } catch (error) {
        console.error('Failed to generate QR code:', error);
    }
}

/**
 * Display address for manual copying
 */
async function copyAddress(address: string, chain: Chain): Promise<void> {
    console.log('\n📋 Copy this address:\n');
    console.log(`  ${address}\n`);
    console.log(`Chain: ${chain}`);
    console.log(`Asset: USDC\n`);
    console.log('💡 Send USDC to this address from your exchange or wallet');

    // Attempt to copy to clipboard (optional, requires clipboardy package)
    try {
        // Uncomment if you add clipboardy: npm install clipboardy
        // const clipboardy = await import('clipboardy');
        // await clipboardy.default.write(address);
        // console.log('✅ Address copied to clipboard!');
    } catch {
        // Silently fail if clipboard not available
    }
}

/**
 * Open Coinbase Pay for purchasing USDC
 */
async function openCoinbasePay(
    wallet: Keypair,
    chain: Chain,
    amount: number
): Promise<void> {
    const address = wallet.publicKey.toString();
    const blockchainParam = getBlockchainParam(chain);
    const url = `https://pay.coinbase.com/buy?address=${address}&blockchain=${blockchainParam}&asset=USDC&amount=${amount}`;

    console.log('\n💳 Opening Coinbase Pay in your browser...');
    console.log(`Amount: $${amount} USDC\n`);

    try {
        await open(url);
        console.log('✅ Coinbase Pay opened');
    } catch (error) {
        console.error('Failed to open browser. Visit manually:');
        console.log(url);
    }

    // Ask if user wants to wait for payment
    const { waitForPayment } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'waitForPayment',
            message: 'Wait for payment confirmation?',
            default: true,
        },
    ]);

    if (waitForPayment) {
        await waitForFunds(wallet, chain); // Pass wallet object
    } else {
        console.log('\n💡 Check your balance later with: x402-router config');
    }
}

/**
 * Wait for funds to arrive (checks every 5 seconds)
 */
async function waitForFunds(wallet: Keypair, chain: Chain): Promise<void> {
    console.log('\n⏳ Waiting for payment...');
    console.log('💡 This may take 30-60 seconds\n');

    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;

    // Get initial balance before starting to wait
    const initialBalance = await getBalance(wallet, chain);

    while (attempts < maxAttempts) {
        await sleep(5000);
        attempts++;

        // Use the real balance check
        const currentBalance = await getBalance(wallet, chain);

        if (currentBalance > initialBalance) { // Check if balance has increased
            const receivedAmount = currentBalance - initialBalance;
            console.log(`\n✅ Payment received!`);
            console.log(`💰 New balance: ${formatUSDC(currentBalance)} USDC`);
            console.log(`Received: ${formatUSDC(receivedAmount)} USDC\n`);
            return;
        }

        // Show progress every 15 seconds
        if (attempts % 3 === 0) {
            console.log(`⏳ Still waiting... (${attempts * 5}s elapsed)`);
        }
    }

    console.log('\n⏱️  Timeout waiting for payment');
    console.log('💡 Check your wallet balance manually with: x402-router balance');
    console.log('💡 Payments may still arrive after this timeout\n');
}

/**
 * Get blockchain parameter for Coinbase Pay
 */
function getBlockchainParam(chain: Chain): string {
    const mapping: Record<Chain, string> = {
        solana: 'solana',
        ethereum: 'ethereum',
        base: 'base',
    };
    return mapping[chain] || chain;
}