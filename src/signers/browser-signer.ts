import { PublicKey, Transaction } from '@solana/web3.js';
import { Signer } from './signer';

/**
 * A type representing the necessary properties from the Solana Wallet Adapter.
 * This avoids a direct dependency on the entire @solana/wallet-adapter-react package.
 */
export interface WalletAdapter {
    publicKey: PublicKey | null;
    signTransaction: ((transaction: Transaction) => Promise<Transaction>) | undefined;
}

/**
 * A Signer implementation for browser environments.
 * It uses a connected wallet adapter (e.g., from Phantom or Solflare) to sign transactions.
 */
export class BrowserWalletSigner implements Signer {
    private adapter: WalletAdapter;

    constructor(adapter: WalletAdapter) {
        if (!adapter.publicKey || !adapter.signTransaction) {
            throw new Error("Wallet adapter is not connected or does not support signing.");
        }
        this.adapter = adapter;
    }

    public get publicKey(): PublicKey {
        // The constructor ensures publicKey is not null.
        return this.adapter.publicKey!;
    }

    public async signTransaction(transaction: Transaction): Promise<Transaction> {
        // The constructor ensures signTransaction is not undefined.
        return this.adapter.signTransaction!(transaction);
    }
}