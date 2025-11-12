# @x402apis/client

Client SDK and CLI for the x402 API Router.

## Installation
```bash
npm install -g @x402apis/client
```

## Quick Start

### Initialize
```bash
x402-router init
```

### Make API call
```bash
x402-router call openai.chat '{"messages":[{"role":"user","content":"Hello!"}]}'
```

### Programmatic Usage
```typescript
import { X402Router } from '@x402apis/client';

const router = new X402Router({
  wallet: '~/.x402-router/solana-wallet.json',
});

const result = await router.call('openai.chat', {
  messages: [{ role: 'user', content: 'Hello!' }]
});

console.log(result.data);
```

## CLI Commands

- `x402-router init` - Initialize wallet
- `x402-router call <api> <params>` - Make API call
- `x402-router fund` - Fund wallet
- `x402-router config` - Manage configuration

## License

MIT