# CLAUDE.md

# WDMWD — Claude Code Instructions

Before making changes to this repository, read [`AGENTS.md`](./AGENTS.md) in full.

`AGENTS.md` is the canonical source of project-specific development guidance and must be followed.

It documents:

- Project architecture and module boundaries.
- Development commands and conventions.
- TypeScript requirements.
- Blockchain data integrity and exact amount handling.
- Evidence classification rules.
- Agent and provider behaviour.
- SQLite persistence.
- Next.js and Docker implementation gotchas.
- Security requirements.
- Frontend design constraints.
- Testing and documentation expectations.
- AGPL-3.0-only licensing requirements.

Do not duplicate those rules in this file. Update `AGENTS.md` when project-wide guidance changes.

## Additional Instructions

- Inspect existing code before modifying it.
- Preserve unrelated user changes.
- Follow the established modular monolith architecture.
- Do not invent functionality, data, or API contracts.
- Do not expose secrets or private model reasoning.
- Preserve the approved WDMWD frontend design.
- Run relevant tests and production checks after changes.
- Report incomplete work and unverified assumptions honestly.

When instructions conflict, follow the applicable repository guidance in `AGENTS.md` and the actual implementation contracts.

**Read `AGENTS.md` before proceeding.**