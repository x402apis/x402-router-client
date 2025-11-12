// This file is the designated entry point for browser environments.
// It exports ONLY the parts of the library that are safe to run in a browser.

// --- SAFE TO EXPORT ---
export { X402Router } from './router.js';
export { PaymentClient } from './payment.js';
export { DiscoveryClient } from './discovery.js';
export * from './types.js';
export * from './errors.js';

// --- SAFE SIGNERS ---
export { BrowserWalletSigner } from './signers/browser-signer.js';
export type { Signer } from './signers/signer.js';

// --- DO NOT EXPORT ---
// We intentionally DO NOT export anything from `wallet.ts` or the `cli/` directory,
// as they contain Node.js-specific code (fs, path, os, commander).