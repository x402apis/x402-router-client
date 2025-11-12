import {
    Provider,
    APIResponse,
    selectBestProvider,
    DEFAULT_REGISTRY_URL,
    TimeoutError,
    InsufficientFundsError,
} from '@x402apis/protocol';
import { DiscoveryClient } from './discovery.js';
import { PaymentClient } from './payment.js';
import { RouterError } from './errors.js';

import { RouterConfig, CallOptions } from './types.js'; // The RouterConfig type will be updated
import { Signer } from './signers/signer.js'; // Import the new core interface

/**
 * X402 Router - A universal client for making API calls in any JS environment.
 */
export class X402Router {
    // --- REPLACED PROPERTIES ---
    // private wallet: Keypair; // This is replaced by the signer
    private signer: Signer;

    // --- EXISTING PROPERTIES ---
    private discovery: DiscoveryClient;
    private payment: PaymentClient;
    private config: Required<Omit<RouterConfig, 'wallet' | 'signer'> & { logging?: boolean, chain?: string, rpcEndpoint?: string }>; // Adjusted config type

    // --- MODIFIED CONSTRUCTOR ---
    constructor(config: RouterConfig) {
        // The new config takes a 'signer' object instead of a 'wallet' file path.
        this.signer = config.signer;

        this.config = {
            registry: config.registry || DEFAULT_REGISTRY_URL,
            chain: config.chain || 'solana',
            rpcEndpoint: config.rpcEndpoint || 'https://api.mainnet-beta.solana.com',
            logging: config.logging ?? true,
        };

        // DiscoveryClient is initialized the same way.
        this.discovery = new DiscoveryClient(this.config.registry);

        // PaymentClient is now initialized with the abstract signer.
        this.payment = new PaymentClient(
            this.signer, // Pass the signer object
            this.config.chain,
            this.config.rpcEndpoint
        );
    }

    /**
     * Make an API call (this public method's signature remains the same).
     */
    async call<T = any>(
        api: string,
        params: Record<string, unknown>,
        options: CallOptions = {}
    ): Promise<APIResponse<T>> {
        const startTime = Date.now();

        try {
            // 1. Discover providers (no change)
            const providers = await this.discoverProviders(api, options);
            if (providers.length === 0) {
                throw new RouterError(`No providers available for ${api}`);
            }

            // 2. Select best provider (no change)
            const provider = options.providerId
                ? await this.discovery.getProvider(options.providerId)
                : selectBestProvider(providers, options);

            if (this.config.logging) {
                console.log(`→ Using provider: ${provider.id} ($${provider.price})`);
            }

            // 3. Check balance (no change)
            await this.ensureFunds(provider.price);

            // 4. Create payment (no change to this line, but the underlying logic in PaymentClient will be different)
            const payment = await this.payment.createPayment(
                provider.wallet,
                provider.price,
                `${provider.url}/${api}`
            );

            // 5. Make request (no change)
            const response = await this.callProvider<T>(provider, api, params, payment, options);

            const latency = Date.now() - startTime;

            if (this.config.logging) {
                console.log(`✓ Request completed in ${latency}ms`);
            }

            return {
                data: response,
                providerId: provider.id,
                cost: provider.price,
                latency,
                timestamp: new Date(),
            };
        } catch (error) {
            if (this.config.logging && error instanceof Error) { // Type-safe error logging
                console.error('✗ Request failed:', error.message);
            }
            throw error;
        }
    }

    // --- NO CHANGES to the methods below this line ---
    // Their internal logic remains the same. The only thing that changes
    // is how the PaymentClient, which they use, is constructed.

    /**
     * Discover providers for API
     */
    private async discoverProviders(api: string, options: CallOptions): Promise<Provider[]> {
        return this.discovery.discover({
            api,
            maxPrice: options.maxPrice,
            minReputation: options.minReputation,
            maxLatency: options.maxLatency,
            limit: 10,
        });
    }

    /**
     * Ensure sufficient funds
     */
    private async ensureFunds(required: number): Promise<void> {
        const balance = await this.payment.getBalance();
        console.log("balance", balance)
        if (balance < required) {
            throw new InsufficientFundsError(required, balance);
        }
    }

    /**
     * Call provider node
     */
    private async callProvider<T>(
        provider: Provider,
        api: string,
        params: Record<string, unknown>,
        payment: any,
        options: CallOptions
    ): Promise<T> {
        // ... This entire method remains exactly the same ...
        const timeout = options.timeout || 30000;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(`${provider.url}/call`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Payment': payment.token,
                    'X-Payment-Chain': payment.chain,
                },
                body: JSON.stringify({ api, params }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (response.status === 402) {
                const error = await response.json() as { message?: string };
                throw new RouterError(`Payment error: ${error.message || 'Payment required'}`);
            }

            if (!response.ok) {
                const error = await response.json() as { error?: string };
                throw new RouterError(`Provider error: ${error.error || response.statusText}`);
            }

            const result = await response.json() as { data: T };
            return result.data;
        } catch (error: any) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                throw new TimeoutError(timeout);
            }

            throw error;
        }
    }

    /**
     * Get wallet balance
     */
    async getBalance(): Promise<number> {
        return this.payment.getBalance();
    }

    /**
     * Clear discovery cache
     */
    clearCache(): void {
        this.discovery.clearCache();
    }
}