import { NodeFileSigner } from '../../signers/node-signer.js'; // Import the Node.js specific signer
import { X402Router } from '../../router.js';
import { loadConfig } from '../../wallet.js';
import { formatUSDC } from '../../utils.js';
import { ConfigError } from '../../errors.js';

export async function callCommand(
    api: string,
    paramsStr: string,
    options: any = {}
): Promise<void> {
    // Load config (this part remains the same)
    const config = loadConfig();
    if (!config) {
        throw new ConfigError('Not initialized. Run: x402-router init');
    }

    // Parse params (this part remains the same)
    let params: any;
    try {
        params = JSON.parse(paramsStr);
    } catch {
        params = { input: paramsStr };
    }

    try {
        // --- THIS IS THE CORE CHANGE ---

        // 1. Get the wallet file path from the config
        const walletPath = config.wallet[config.defaultChain];
        if (!walletPath) {
            throw new ConfigError(`No wallet configured for the default chain: ${config.defaultChain}`);
        }

        // 2. Create an instance of the NodeFileSigner
        const signer = new NodeFileSigner(walletPath);

        // 3. Initialize the X402Router with the signer object
        const router = new X402Router({
            signer: signer, // Pass the signer object
            chain: config.defaultChain,
            logging: true,
        });

        // --- THE REST OF THE COMMAND LOGIC IS UNCHANGED ---

        console.log(`\n🚀 Calling ${api}...`);

        const result = await router.call(api, params, {
            maxPrice: options.maxPrice,
            preferCheap: options.preferCheap,
            timeout: options.timeout,
        });

        console.log(`\n✅ Success!`);
        console.log(`💰 Cost: ${formatUSDC(result.cost)}`);
        console.log(`⏱️  Latency: ${result.latency}ms`);
        console.log(`📦 Provider: ${result.providerId}\n`);
        console.log('Response:');
        console.log(JSON.stringify(result.data, null, 2));

    } catch (error: any) {
        console.error(`\n❌ Error: ${error.message}`);
        process.exit(1);
    }
}