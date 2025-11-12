import fetch from 'node-fetch';
import {
    Provider,
    DiscoveryRequest,
    DiscoveryResponse,
    DEFAULT_REGISTRY_URL,
    ProviderNotFoundError,
} from '@x402apis/protocol';
import { DiscoveryError } from './errors.js';

/**
 * Discovery client for finding providers
 */
export class DiscoveryClient {
    private registryUrl: string;
    private cache: Map<string, { providers: Provider[]; expiresAt: number }>;

    constructor(registryUrl: string = DEFAULT_REGISTRY_URL) {
        this.registryUrl = registryUrl;
        this.cache = new Map();
    }

    /**
     * Discover providers for an API
     */
    async discover(request: DiscoveryRequest): Promise<Provider[]> {
        const cacheKey = this.getCacheKey(request);
        const cached = this.cache.get(cacheKey);

        // Return cached if valid
        if (cached && Date.now() < cached.expiresAt) {
            return this.filterProviders(cached.providers, request);
        }

        // Fetch from registry
        try {
            const response = await fetch(`${this.registryUrl}/discover`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request),
            });

            if (!response.ok) {
                throw new Error(`Registry returned ${response.status}`);
            }

            const data: DiscoveryResponse = await response.json();

            // Cache results
            this.cache.set(cacheKey, {
                providers: data.providers,
                expiresAt: Date.now() + (data.cacheTTL * 1000),
            });

            return this.filterProviders(data.providers, request);
        } catch (error) {
            throw new DiscoveryError(`Failed to discover providers: ${error}`);
        }
    }

    /**
     * Get specific provider by ID
     */
    async getProvider(providerId: string): Promise<Provider> {
        try {
            const response = await fetch(`${this.registryUrl}/provider/${providerId}`);

            if (!response.ok) {
                throw new ProviderNotFoundError(providerId);
            }

            return response.json();
        } catch (error) {
            throw new DiscoveryError(`Failed to get provider: ${error}`);
        }
    }

    /**
     * Filter providers by request criteria
     */
    private filterProviders(providers: Provider[], request: DiscoveryRequest): Provider[] {
        let filtered = providers;

        if (request.maxPrice !== undefined) {
            filtered = filtered.filter(p => p.price <= request.maxPrice!);
        }

        if (request.minReputation !== undefined) {
            filtered = filtered.filter(p => p.reputation >= request.minReputation!);
        }

        if (request.maxLatency !== undefined) {
            filtered = filtered.filter(p => p.latency <= request.maxLatency!);
        }

        if (request.limit !== undefined) {
            filtered = filtered.slice(0, request.limit);
        }

        return filtered;
    }

    /**
     * Generate cache key
     */
    private getCacheKey(request: DiscoveryRequest): string {
        return `${request.api}:${request.maxPrice}:${request.minReputation}:${request.maxLatency}`;
    }

    /**
     * Clear cache
     */
    clearCache(): void {
        this.cache.clear();
    }
}