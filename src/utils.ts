import { homedir } from 'os';
import { join } from 'path';

/**
 * Get config directory path
 */
export function getConfigDir(): string {
    return join(homedir(), '.x402-router');
}

/**
 * Get config file path
 */
export function getConfigFile(): string {
    return join(getConfigDir(), 'config.json');
}

/**
 * Format USDC amount
 */
export function formatUSDC(amount: number): string {
    return `$${amount.toFixed(4)}`;
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Truncate wallet address
 */
export function truncateAddress(address: string, chars: number = 4): string {
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

