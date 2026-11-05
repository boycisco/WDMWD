# Security Policy

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

If you discover a vulnerability in WDMWD, please report it privately:

1. Open a [GitHub Security Advisory](https://github.com/boycisco/WDMWD/security/advisories/new) on this repository, or
2. Contact the maintainer directly through the email address on their GitHub profile.

Include in your report:

- A description of the vulnerability
- Steps to reproduce (proof of concept if possible)
- Affected version(s) or commit hash
- Your assessment of impact and severity
- Any suggested mitigation

You can expect:

- Acknowledgement within **72 hours**
- A remediation plan within **7 days** for confirmed issues
- Credit in the release notes (unless you prefer to remain anonymous)

## Supported Versions

WDMWD is under active development. Only the latest commit on `main` is supported. There are no LTS branches.

## Security Model

WDMWD is a **read-only onchain intelligence assistant**. It is designed to be safe by default for a single user running locally. The threat model below describes what the project defends against and what it explicitly does not.

### What WDMWD never does

- Requests or stores private keys or seed phrases
- Signs or broadcasts transactions
- Moves funds
- Uploads wallet addresses to a WDMWD-owned service

### Default deployment

- Server binds to `127.0.0.1` (loopback only)
- No authentication is required because only the local machine can reach the API
- All data (conversations, evidence, settings) lives in a local SQLite file

### Remote deployment

If you bind the server to a public interface (`HOST=0.0.0.0`), you **must**:

- Set `REMOTE_ACCESS=true` explicitly (the config loader refuses to start otherwise)
- Place the server behind a reverse proxy that terminates TLS
- Add authentication (HTTP Basic, OAuth proxy, or similar) at the proxy layer
- **Do not** expose the `/api/chat` endpoint unauthenticated — it consumes paid API credits

WDMWD does **not** ship built-in authentication. This is deliberate: single-owner self-hosting with a reverse proxy is the expected pattern, and shipping a half-baked auth system would be worse than none.

### Secrets handling

- API keys are read from environment variables only
- `.env` is gitignored; `.env.example` documents the variables without values
- The `/api/settings` endpoint returns only `*Configured: true/false` flags, never actual keys
- Errors returned to clients never contain API keys, tokens, or full stack traces

### Known limitations relevant to security

- **Provider trust**: WDMWD trusts the configured RPC provider (Base mainnet public endpoint or your own Alchemy project) to return accurate blockchain data. A compromised provider could serve false data. For high-stakes use, run your own Base node.
- **Model trust**: The AI provider (Google Gemini, or OpenAI if configured) receives the content of your conversations. Local models are not yet supported. Do not paste secrets into the chat.
- **Prompt injection via blockchain data**: Token symbols, contract names, and event data are untrusted input. The system prompt instructs the model to ignore instructions embedded in blockchain data, but no LLM defense is perfect. Treat any model output as advisory and verify against the cited evidence.
- **Rate limits**: The Gemini free tier is intended for personal use only. Do not run WDMWD as a public service on free-tier credentials.

### Development dependencies

`npm audit` reports moderate-severity issues in dev dependencies (ESLint tooling). These affect the development environment only and are not part of the shipped application. Production dependencies (`--omit=dev`) audit clean. See `docs/security-review.md` for details.

## Disclosure Policy

We follow coordinated disclosure. Once a fix is released, we will publish a GitHub Security Advisory describing the vulnerability and remediation.

## Acknowledgements

WDMWD thanks all security researchers who responsibly disclose issues.