import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import {
    getAssociatedTokenAddress,
    createTransferCheckedInstruction,
    createAssociatedTokenAccountInstruction,
    getAccount,
    TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

import { Chain, Payment } from '@x402apis/protocol';
import { PaymentError } from './errors.js';

// --- NEW IMPORT ---
import { Signer } from './signers/signer.js'; // Import the new core interface

// Mainnet USDC Mint Address (6 decimals)
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

/**
 * Payment client for creating and verifying x402 payments, using an abstract Signer.
 */
export class PaymentClient {
    private signer: Signer;

    // --- EXISTING PROPERTIES ---
    private chain: Chain;
    private connection?: Connection;

    // --- MODIFIED CONSTRUCTOR ---
    constructor(signer: Signer, chain: Chain = 'solana', rpcEndpoint?: string) {
        this.signer = signer; // It now accepts a Signer object
        this.chain = chain;

        if (chain === 'solana' && rpcEndpoint) {
            this.connection = new Connection(rpcEndpoint, 'confirmed');
        }
    }

    /**
     * Create payment for API call
     */
    async createPayment(to: string, amount: number, resource: string): Promise<Payment> {
        try {
            // This logic for free APIs needs to be disabled as we can't sign messages without the secret key.
            // A new method would be needed for browser wallets to sign arbitrary messages.
            if (amount === 0) {
                console.warn(
                    '⚠️  Free API calls with signed proof are not supported in this version for browser wallets. Skipping payment.'
                );
                return {
                    token: 'free-api-call', // Use a simple placeholder token
                    to,
                    amount: 0,
                    resource,
                    chain: this.chain,
                    timestamp: new Date(),
                };
            }

            if (this.chain === 'solana') {
                if (!this.connection) {
                    throw new PaymentError('Solana connection not initialized');
                }

                const providerPubkey = new PublicKey(to);
                const senderPubkey = this.signer.publicKey; // Use the signer's public key

                const senderTokenAccount = await getAssociatedTokenAddress(USDC_MINT, senderPubkey);
                const providerTokenAccount = await getAssociatedTokenAddress(USDC_MINT, providerPubkey);

                const [senderAccountInfo, providerAccountInfo] = await Promise.all([
                    this.connection.getAccountInfo(senderTokenAccount),
                    this.connection.getAccountInfo(providerTokenAccount),
                ]);

                const transaction = new Transaction();

                if (!senderAccountInfo) {
                    transaction.add(
                        createAssociatedTokenAccountInstruction(
                            senderPubkey, // payer
                            senderTokenAccount, // associated token account
                            senderPubkey, // owner
                            USDC_MINT // mint
                        )
                    );
                }

                if (!providerAccountInfo) {
                    transaction.add(
                        createAssociatedTokenAccountInstruction(
                            senderPubkey, // payer (you pay for their account creation)
                            providerTokenAccount, // associated token account
                            providerPubkey, // owner (provider)
                            USDC_MINT // mint
                        )
                    );
                }

                const amountInBaseUnits = Math.floor(amount * 1_000_000);

                transaction.add(
                    createTransferCheckedInstruction(
                        senderTokenAccount, // source
                        USDC_MINT, // mint
                        providerTokenAccount, // destination
                        senderPubkey, // owner
                        amountInBaseUnits, // amount in base units
                        6 // decimals
                    )
                );

                const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
                transaction.recentBlockhash = blockhash;
                transaction.feePayer = senderPubkey;

                // --- THE CORE CHANGE: DELEGATE SIGNING ---
                // Instead of transaction.sign(this.wallet), we ask the signer to do it.
                console.log('✍️  Requesting signature from wallet...');
                const signedTransaction = await this.signer.signTransaction(transaction);

                console.log(`💸 Sending payment of ${amount} USDC to ${to}...`);

                const signature = await this.connection.sendRawTransaction(signedTransaction.serialize(), {
                    skipPreflight: false,
                    preflightCommitment: 'confirmed',
                });

                console.log(`📝 Transaction signature: ${signature}`);

                const confirmation = await this.connection.confirmTransaction(
                    {
                        signature,
                        blockhash,
                        lastValidBlockHeight,
                    },
                    'confirmed'
                );

                if (confirmation.value.err) {
                    throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
                }

                console.log(`✅ Payment confirmed!`);

                return {
                    token: signature,
                    to,
                    amount,
                    resource,
                    chain: this.chain,
                    timestamp: new Date(),
                };
            }

            throw new PaymentError(`Payment creation not implemented for chain: ${this.chain}`);
        } catch (error) {
            if (error instanceof Error) {
                throw new PaymentError(`Failed to create payment: ${error.message}`);
            }
            throw new PaymentError(`An unknown error occurred during payment creation.`);
        }
    }

    /**
     * Get USDC balance
     */
    async getBalance(): Promise<number> {
        try {
            if (this.chain === 'solana' && this.connection) {
                // Get the Associated Token Account (ATA) address for USDC for the signer's public key
                const tokenAccountAddress = await getAssociatedTokenAddress(
                    USDC_MINT, // The public key of the USDC mint
                    this.signer.publicKey, // The public key of the wallet we're checking
                    false, // allowOwnerOffCurve - typically false
                    TOKEN_PROGRAM_ID
                );

                try {
                    // Fetch the account info for the ATA
                    const tokenAccountInfo = await getAccount(this.connection, tokenAccountAddress);

                    // The amount is in the smallest unit (6 decimals for USDC).
                    // We divide by 1,000,000 to get the human-readable amount.
                    const balance = Number(tokenAccountInfo.amount) / 1_000_000;
                    return balance;
                } catch (error: any) {
                    // This is a common "error" that simply means the account doesn't exist yet.
                    // If the account doesn't exist, the balance is 0.
                    if (error.name === 'TokenAccountNotFoundError') {
                        return 0;
                    }
                    // Re-throw other, unexpected errors.
                    throw error;
                }
            }

            // Return 0 for non-Solana chains or if there's no connection
            return 0;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new PaymentError(`Failed to get balance: ${errorMessage}`);
        }
    }
}
