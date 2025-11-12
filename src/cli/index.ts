#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { callCommand } from './commands/call.js';
import { fundCommand } from './commands/fund.js';
import { balanceCommand } from './commands/balance.js';

import { configCommand } from './commands/config.js';

const program = new Command();

program
    .name('x402-router')
    .description('Universal x402 API Router')
    .version('1.0.0');

program
    .command('init')
    .description('Initialize wallet and configuration')
    .option('--chain <chain>', 'Blockchain to use (solana|ethereum|base)', 'solana')
    .action(initCommand);

program
    .command('call <api> <params>')
    .description('Make an API call via x402')
    .option('--max-price <amount>', 'Maximum price willing to pay')
    .option('--prefer-cheap', 'Prefer cheaper providers')
    .option('--timeout <ms>', 'Request timeout in milliseconds')
    .action(callCommand);

program
    .command('fund')
    .description('Fund your wallet')
    .option('--chain <chain>', 'Chain to fund')
    .option('--amount <amount>', 'Amount to add', '10')
    .action(fundCommand);

program
    .command('balance')
    .description('Check wallet balance')
    .option('--chain <chain>', 'Chain to check')
    .action(balanceCommand);

program
    .command('config [action] [key] [value]')
    .description('Manage configuration (get/set)')
    .action(configCommand);

program.parse();