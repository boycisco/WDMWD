# Security Policy

WDMWD is a local-first, read-only onchain investigation application. It does not request wallet private keys, sign transactions, or broadcast transactions. It does process conversation content and retrieved onchain context, so operators should still treat the local database and provider credentials as sensitive.

## Supported versions

Security reports should target the latest maintained version or the current default branch. The project does not promise security fixes for every historical revision.

## Reporting a vulnerability

**Do not publish security vulnerabilities in a public issue or pull request.**

Use GitHub's private vulnerability reporting feature for this repository when it is enabled. If private reporting is not available, contact the repository maintainer through an existing private contact channel and avoid posting exploit details publicly.

Include, where possible:

- A clear description of the issue.
- The affected version or commit.
- Steps to reproduce the behaviour.
- The impact and realistic attack conditions.
- A suggested mitigation, if known.

Do not include real API keys, private user data, or other secrets in a report. Redact them from logs and screenshots.

## Deployment and access control

The documented default bind address is `127.0.0.1`. Non-loopback access requires an explicit `REMOTE_ACCESS=true` configuration decision.

Enabling remote access does not add authentication, TLS, or a public-facing access-control layer. Do not expose the application port directly to the public internet. Use a properly configured reverse proxy or private network with HTTPS and authentication, and restrict access at the network layer.

## Secrets and configuration

- Keep `.env` out of version control.
- Use `.env.example` only for non-secret placeholders.
- Do not place API keys in `NEXT_PUBLIC_*` variables.
- Do not commit SQLite databases, database backups, logs, or provider responses that contain private information.
- Rotate a credential immediately if it is exposed in source control, logs, screenshots, or an issue.
- Do not return secret values from API endpoints or include them in error messages.

## Data and privacy

WDMWD stores conversations and investigation data in its local SQLite database. The application sends prompts and relevant retrieved context to the AI provider configured by the operator. Blockchain queries are sent to the configured RPC and indexing providers.

Operators should review the privacy and data-retention terms of their configured providers. Protect the SQLite database and backups as user data. Anyone with access to the local application or its database may be able to read stored conversation content.

## Security considerations

Review changes involving:

- Remote binding, host validation, and CORS.
- API request validation and request-size limits.
- Rate limits and agent execution limits.
- Session identifiers and session deletion.
- SQLite paths and file permissions.
- Provider credentials and error logging.
- Model tool calls and tool argument validation.
- Untrusted text returned by blockchain contracts, token metadata, and external providers.

The AI model must not be treated as a security boundary. Validate tool inputs and outputs in application code.
