/**
 * Base router error
 */
export class RouterError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'RouterError';
    }
}

/**
 * Wallet error
 */
export class WalletError extends RouterError {
    constructor(message: string) {
        super(message);
        this.name = 'WalletError';
    }
}

/**
 * Discovery error
 */
export class DiscoveryError extends RouterError {
    constructor(message: string) {
        super(message);
        this.name = 'DiscoveryError';
    }
}

/**
 * Payment error
 */
export class PaymentError extends RouterError {
    constructor(message: string) {
        super(message);
        this.name = 'PaymentError';
    }
}

/**
 * Configuration error
 */
export class ConfigError extends RouterError {
    constructor(message: string) {
        super(message);
        this.name = 'ConfigError';
    }
}