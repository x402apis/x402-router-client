import { Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { readFileSync } from 'fs';
import { Signer } from './signer';

/**
 * A Signer implementation for Node.js environments.
 * It loads a keypair from a local JSON file.
 */
export class NodeFileSigner implements Signer {
    private keypair: Keypair;

    constructor(filePath: string) {
        try {
            const secretKey = JSON.parse(readFileSync(filePath, 'utf-8'));
            this.keypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));
        } catch (error) {
            throw new Error(`Failed to load wallet from ${filePath}: ${(error as Error).message}`);
        }
    }

    public get publicKey(): PublicKey {
        return this.keypair.publicKey;
    }

    public async signTransaction(transaction: Transaction): Promise<Transaction> {
        transaction.partialSign(this.keypair);
        return transaction;
    }
}