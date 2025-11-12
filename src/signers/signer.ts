import { PublicKey, Transaction } from '@solana/web3.js';

/**
 * An abstract interface for signing Solana transactions.
 * This allows the X402Router to be environment-agnostic.
 */
export interface Signer {
    /** The public key of the wallet associated with this signer. */
    publicKey: PublicKey;

    /**
     * Signs a given transaction.
     * @param transaction The transaction to sign.
     * @returns A promise that resolves to the signed transaction.
     */
    signTransaction(transaction: Transaction): Promise<Transaction>;
}