# Contributing

Thank you for considering a contribution to WDMWD. The project is a local-first, single-user onchain investigation assistant. Contributions should keep the application focused, evidence-grounded, and straightforward to self-host.

## Before opening a pull request

- Search existing issues and pull requests for related work.
- For substantial changes, open an issue or discussion first so the scope can be agreed.
- Do not bundle unrelated refactors with a feature or bug fix.
- Do not include secrets, local databases, personal data, or generated build output.

For security vulnerabilities, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.

## Development setup

Requirements and environment variables are documented in [README.md](README.md).

```bash
git clone https://github.com/boycisco/WDMWD.git
cd WDMWD
npm install
cp .env.example .env
```

Configure the provider credentials needed for the part of the application you are working on. Apply local migrations and start the application:

```bash
npm run db:migrate
npm run dev
```

## Project boundaries

WDMWD is a unified Next.js modular monolith. Keep the existing application architecture unless a change has a clear technical reason.

- Keep provider-specific blockchain code inside the data-adapter layer.
- Keep model-provider-specific code behind the model interface.
- Keep investigation logic deterministic where possible.
- Validate external inputs and model-generated tool arguments.
- Preserve exact token arithmetic using integer types such as `BigInt`.
- Keep evidence references attached to findings.
- Distinguish confirmed facts, inferences, and unknowns.
- Do not add unsupported features to documentation or UI copy.
- Preserve the existing chat-first frontend design.

## Code style

- Use TypeScript types that reflect actual runtime data.
- Prefer small modules with clear responsibilities.
- Reuse existing validation and error-handling patterns.
- Avoid adding dependencies when the current stack can handle the requirement.
- Keep file names short and consistent with nearby code, while respecting framework-required names.
- Add comments for non-obvious decisions, not line-by-line narration.

## Tests and checks

Before submitting a pull request, run the relevant tests and checks:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Run the opt-in live tests when the change affects live provider integration and valid credentials are available. Document any checks that could not be run.

Add or update tests for behaviour changes. Do not remove or weaken a test solely to make the suite pass.

## Documentation

Update documentation whenever a change affects:

- Setup or environment variables.
- API requests, responses, or SSE events.
- Database schema or migrations.
- Provider behaviour.
- Security or deployment configuration.
- User-visible capabilities or limitations.

Examples in documentation must match the implementation.

## Pull requests

A useful pull request includes:

1. A concise summary of the problem and solution.
2. The relevant issue, if one exists.
3. A description of user-visible changes.
4. Tests and commands run, with actual results.
5. Documentation updates.
6. Any known limitations or migration concerns.

Keep pull requests focused and explain changes that affect stored data, deployment, or security.

## License

By contributing, you agree that your contribution is provided under the project's [AGPL-3.0 license](LICENSE), subject to the applicable terms of that license.
