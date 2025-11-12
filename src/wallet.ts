import { Keypair, Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { Chain } from '@x402apis/protocol';
import { WalletError } from './errors.js';

const CONFIG_DIR = join(homedir(), '.x402-router');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

// Mainnet USDC Mint Address (6 decimals)
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

/**
 * Ensure config directory exists
 */
export function ensureConfigDir(): void {
    if (!existsSync(CONFIG_DIR)) {
        mkdirSync(CONFIG_DIR, { recursive: true });
    }
}

/**
 * Load Solana wallet from file
 */
export function loadWallet(path: string): Keypair {
    try {
        const secretKey = JSON.parse(readFileSync(path, 'utf-8'));
        return Keypair.fromSecretKey(Uint8Array.from(secretKey));
    } catch (error) {
        throw new WalletError(`Failed to load wallet from ${path}: ${error}`);
    }
}

/**
 * Save Solana wallet to file
 */
export function saveWallet(wallet: Keypair, path: string): void {
    try {
        ensureConfigDir();
        const secretKey = Array.from(wallet.secretKey);
        writeFileSync(path, JSON.stringify(secretKey), { mode: 0o600 });
    } catch (error) {
        throw new WalletError(`Failed to save wallet to ${path}: ${error}`);
    }
}

/**
 * Generate new Solana wallet
 */
export function generateWallet(): Keypair {
    return Keypair.generate();
}

/**
 * Get wallet balance (USDC)
 */
export async function getBalance(
    wallet: Keypair,
    chain: Chain = 'solana'
): Promise<number> {
    if (chain !== 'solana') {
        console.log(`\n[Balance Check] Balance check not implemented for ${chain}.`);
        return 0;
    }

    try {
        const connection = new Connection('https://api.mainnet-beta.solana.com');
        const ownerPubkey = new PublicKey(wallet.publicKey); // Ensure it's a valid PublicKey instance

        // 1. Get the Associated Token Account (ATA) address
        const tokenAccountAddress = await getAssociatedTokenAddress(
            USDC_MINT,
            ownerPubkey,
            false,
            TOKEN_PROGRAM_ID // Explicitly pass the program ID
        );

        // 2. Get the token account information
        const account = await getAccount(connection, tokenAccountAddress);

        // 3. Convert the raw amount (in lamports/smallest unit) to USDC (6 decimals)
        const balance = Number(account.amount) / 1e6;

        // 4. Console Log the result (as requested)
        console.log(`\n[Balance Check] Found ${balance.toFixed(4)} USDC on ${chain} for ${wallet.publicKey.toBase58()}`);

        // 5. Return the balance (REQUIRED by calling functions like X402Router.ensureFunds)
        return balance;

    } catch (error: any) {
        // If the token account does not exist, getAccount will throw an error.
        if (error?.name === 'TokenAccountNotFoundError') {
            console.log(`\n[Balance Check] Found 0.0000 USDC on ${chain}. Token account does not exist.`);
            return 0;
        }

        // Log other errors and return 0 as a safe default
        console.error("\n[Balance Check] Error fetching USDC balance:", error.message);
        return 0;
    }
}

/**
 * Load user config
 */
export function loadConfig(): any {
    try {
        if (!existsSync(CONFIG_FILE)) {
            return null;
        }
        return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
    } catch (error) {
        throw new WalletError(`Failed to load config: ${error}`);
    }
}

/**
 * Save user config
 */
export function saveConfig(config: any): void {
    try {
        ensureConfigDir();
        writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    } catch (error) {
        throw new WalletError(`Failed to save config: ${error}`);
    }
}

/**
 * Get default wallet path for chain
 */
export function getDefaultWalletPath(chain: Chain): string {
    return join(CONFIG_DIR, `${chain}-wallet.json`);
}