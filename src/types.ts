import { Chain, CallOptions as ProtocolCallOptions } from '@x402apis/protocol';
import { Signer } from './signers/signer';

/**
 * Router configuration
 */
export interface RouterConfig {
    /** An environment-specific signer for approving transactions. */
    signer: Signer;

    /** Registry URL */
    registry?: string;

    /** Default chain */
    chain?: Chain;

    /** RPC endpoint */
    rpcEndpoint?: string;

    /** Enable logging */
    logging?: boolean;
}

/**
 * Router call options (extends protocol options)
 */
export interface CallOptions extends ProtocolCallOptions {
    /** Force specific chain */
    chain?: Chain;
    providerId?: string;

}

/**
 * Wallet configuration stored in config file
 */
export interface WalletConfig {
    /** Solana wallet path */
    solana?: string;

    /** Ethereum wallet path */
    ethereum?: string;

    /** Base wallet path */
    base?: string;
}

/**
 * User configuration file (~/.x402-router/config.json)
 */
export interface UserConfig {
    /** Wallet paths by chain */
    wallet: WalletConfig;

    /** Default chain */
    defaultChain: Chain;

    /** Registry URL */
    registry: string;

    /** Auto-funding configuration */
    autoFund?: {
        enabled: boolean;
        provider: 'coinbase' | 'solana' | 'manual';
        minBalance: number;
        topUpAmount: number;
    };

    /** Default call preferences */
    preferences?: {
        preferCheap?: boolean;
        maxPrice?: number;
        timeout?: number;
    };
}

/**
 * Funding options
 */
export interface FundingOptions {
    method: 'qr' | 'copy' | 'coinbase' | 'skip';
    amount?: number;
    chain?: Chain;
}