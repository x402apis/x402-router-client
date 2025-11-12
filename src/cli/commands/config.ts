import inquirer from 'inquirer';
import { loadConfig, saveConfig } from '../../wallet.js';
import { ConfigError } from '../../errors.js';

export async function configCommand(action?: string, key?: string, value?: string): Promise<void> {
    const config = loadConfig();
    if (!config) {
        throw new ConfigError('Not initialized. Run: x402-router init');
    }

    if (!action) {
        // Show current config
        console.log('\n📝 Current configuration:\n');
        console.log(JSON.stringify(config, null, 2));
        return;
    }

    if (action === 'set' && key && value) {
        // Set config value
        const keys = key.split('.');
        let obj: any = config;

        for (let i = 0; i < keys.length - 1; i++) {
            obj = obj[keys[i]];
        }

        obj[keys[keys.length - 1]] = parseValue(value);
        saveConfig(config);

        console.log(`✅ Set ${key} = ${value}`);
    } else if (action === 'get' && key) {
        // Get config value
        const keys = key.split('.');
        let value: any = config;

        for (const k of keys) {
            value = value[k];
        }

        console.log(value);
    } else {
        console.error('Usage: x402-router config [get|set] <key> [value]');
    }
}

function parseValue(value: string): any {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (!isNaN(Number(value))) return Number(value);
    return value;
}