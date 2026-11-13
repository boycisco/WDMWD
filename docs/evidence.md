# Evidence Model

WDMWD separates retrieved data from the conclusions the agent draws from it. The purpose of the evidence model is to make an investigation inspectable and to distinguish direct observations from interpretation.

## Claim classifications

The agent uses three classifications:

| Classification | Meaning | How to read it |
|---|---|---|
| `CONFIRMED` | Directly supported by retrieved onchain or provider data. | The cited source supports the stated fact within the limits of that source. |
| `INFERRED` | A reasoned interpretation of available evidence. | Plausible, but not directly proven by the available records. |
| `UNKNOWN` | The available data does not establish the answer. | The system should state the uncertainty rather than guess. |

These labels describe the strength of the available evidence, not a guarantee that an external provider is infallible. A confirmed observation may still be incomplete if the underlying data source has limited coverage.

## Findings

Wallet investigation findings are structured with fields including:

- `id`: finding identifier.
- `title`: short finding title.
- `explanation`: readable explanation.
- `classification`: `CONFIRMED`, `INFERRED`, or `UNKNOWN`.
- `evidenceIds`: evidence records supporting the finding.
- `limitations`: constraints or caveats relevant to the finding.

Findings should identify their supporting evidence. An inference should not be presented as a direct onchain fact.

## Evidence records

The wallet investigation response exposes evidence records with fields including:

| Field | Purpose |
|---|---|
| `id` | Evidence identifier referenced by findings and chat events. |
| `chainId` | Chain identifier for the source record. |
| `type` | Kind of evidence record. |
| `classification` | Evidence classification. |
| `transactionHash` | Transaction associated with the evidence, when applicable. |
| `blockNumber` | Block number, when available. |
| `blockTimestamp` | Block timestamp, when available. |
| `addresses` | Addresses associated with the record. |
| `contractAddress` | Relevant contract address, when applicable. |
| `data` | Structured source data. |
| `source` | Provider or subsystem that supplied the record. |
| `retrievedAt` | Time the application retrieved the record. |

Some fields may be absent or empty depending on the evidence type. Consumers should render only fields that are present and should not manufacture missing transaction details.

## Evidence in chat streams

The chat API emits one `evidence` SSE event **per evidence item** produced by a tool. Each event carries the full frontend-ready evidence record, not just an identifier. Example:

```json
{
  "evidence": {
    "id": "ev_abc123",
    "classification": "confirmed",
    "title": "ETH Transfer",
    "txHash": "0x...",
    "address": "0x...",
    "blockNumber": 12345678,
    "timestamp": "2024-01-01T00:00:00.000Z",
    "assetMovement": "+1.5 ETH",
    "source": "alchemy:8453",
    "explorerLink": "https://basescan.org/tx/0x..."
  }
}
```

Fields may be omitted when the underlying evidence does not support them (e.g., an evidence record without a transaction hash will not include txHash or explorerLink). Clients should render only the fields that are present.

## Evidence interpretation rules

1. Distinguish observed facts from inferred relationships or explanations.
2. Preserve exact transaction hashes and addresses when showing references.
3. Do not convert missing data into a negative claim.
4. Do not infer wallet ownership or a person's identity from onchain interaction alone.
5. Do not imply a transaction succeeded when the receipt indicates a revert.
6. Do not state exact token quantities if the source data does not support an exact value.
7. Keep source limitations visible when they materially affect the conclusion.

## Explorer links

For Base Mainnet, the frontend may link an address or transaction to BaseScan using:

```text
https://basescan.org/address/{address}
https://basescan.org/tx/{transactionHash}
```

The explorer link is a convenience for independent inspection. The application should preserve the original evidence reference and must not imply that linking to an explorer independently validates the agent's interpretation.
