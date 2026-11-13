# Blockchain Data

WDMWD V1 investigates **Base Mainnet**, identified by chain ID `8453`.

The application separates blockchain access from investigation logic through provider adapters. The reported implementation uses Viem for RPC operations and Alchemy for indexed/historical activity.

## Providers

### Viem and Base RPC

Viem is used to interact with the configured Base JSON-RPC endpoint for chain data required by the application, including transaction and block-level queries.

The documented public Base RPC fallback is:

```text
https://mainnet.base.org
```

Operators may configure a different endpoint using `BASE_RPC_URL`.

### Alchemy

Alchemy is used for indexed and historical wallet activity. Configure `ALCHEMY_API_KEY` when using the Alchemy-backed history path.

Provider-specific code should remain inside the data adapter layer. Wallet and transaction investigation logic should consume normalized application data rather than depending directly on provider response shapes.

## Supported V1 investigations

### Wallet activity

The current wallet investigation path works with indexed transfer activity, including the supported native and token transfer event categories described by the implementation:

- Native asset transfers.
- ERC-20 transfers.
- ERC-721 transfers.
- ERC-1155 transfers.

The wallet result can include transfer counts, counterparties, interacted contracts, block range, and totals grouped by token symbol where the source data supports them.

The result is constrained by the configured provider's indexing coverage and the requested history limit.

### Transaction inspection

The transaction investigation path reports available transaction-level details such as:

- Transaction hash.
- Sender and recipient.
- Success or reverted status.
- ETH value.
- Gas cost.
- Whether the destination is identified as a contract or an externally owned account (EOA).
- Event-log information available to the current implementation.

V1 does not provide complete ABI decoding of every event into a semantic list of token transfers. An event being present is not, by itself, a complete explanation of the token movement.

## Exact amount handling

Blockchain quantities are integers. Converting token amounts to JavaScript floating-point numbers can lose precision, especially for assets with many decimal places or large values.

The reported Alchemy implementation avoids relying on the floating-point `value` field for exact token amounts. It reads the raw contract value represented as hexadecimal, converts it to `BigInt`, and stores an exact decimal-string representation. Token decimals are then used when presenting human-readable values.

Do not replace this path with `Number()` arithmetic for raw token quantities.

## Data limitations

The current V1 wallet investigation is based on supported indexed transfer activity. The project report identifies these limitations:

- Internal movements between contracts may not be represented by the indexed transfer path.
- Activity outside the provider's available history window may be missing.
- Zero-value calls are not included in the transfer activity view.
- Provider indexing, rate limits, and outages can affect completeness.
- Transaction event logs are not fully decoded into all token-level semantic movements.

A missing record means the current data path did not return it. It is not proof that no onchain activity occurred.

## Network scope

Only Base Mainnet is configured in V1. The chain registry provides an extension point, but Ethereum, Optimism, Arbitrum, and other networks are not supported merely because they are EVM-compatible.

The chat request accepts `chainId`, but callers should use `8453` unless and until another chain is explicitly registered and implemented.

## Read-only behaviour

WDMWD is an investigation application. Its blockchain integration reads public chain and indexer data. It does not request private keys, sign transactions, broadcast transactions, or move funds.
