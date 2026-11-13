# Deployment

WDMWD is a unified Next.js application. One application process serves the chat interface and API. Persistent application data is stored in SQLite.

This guide covers local development and Docker-based self-hosting. Remote access is not secured by WDMWD itself; read the [Security Policy](../SECURITY.md) before exposing an instance beyond the local machine.

## Local development

From the repository root:

```bash
npm install
cp .env.example .env
```

On Windows PowerShell:

```powershell
npm install
Copy-Item .env.example .env
```

Edit `.env` and configure the required Base data and AI provider credentials. Then apply migrations and start the development server:

```bash
npm run db:migrate
npm run dev
```

The documented default bind is `127.0.0.1:3000`.

### Testing from a phone on the same network

For development-only mobile testing, add the development machine's hostname or IP address to `NEXT_ALLOWED_DEV_ORIGINS`, using the format expected by `.env.example` and the Next.js configuration. This setting is for the development server. It is not a production remote-access security control.

## Docker deployment

The repository includes a multi-stage Dockerfile and `compose.yaml`. The Compose setup runs the application as one service and mounts persistent storage for the SQLite database.

### First run

```bash
cp .env.example .env
# Edit .env and add the credentials required by your chosen providers.
docker compose up -d --build
```

On container startup, the application runs pending database migrations through its Node instrumentation startup path before serving requests. Do not run an obsolete standalone migration command inside the container.

### Verify startup

```bash
docker compose ps
docker compose logs --tail=100 wdmwd
curl http://127.0.0.1:3000/api/health
```

Inspect both the container health state and the JSON response from `/api/health`. An HTTP 200 response may still contain a degraded subsystem status.

### Follow logs

```bash
docker compose logs -f wdmwd
```

Look for successful migration/startup messages and investigate any configuration, database, or provider errors. Do not depend on exact Next.js startup log wording or timing; these can change between versions.

### Stop and restart

```bash
docker compose stop
docker compose start
```

A normal stop should allow the application to close its SQLite connection cleanly.

### Stop and remove containers

```bash
docker compose down
```

This removes the containers and network but normally preserves named volumes.

**Destructive operation:**

```bash
docker compose down -v
```

The `-v` option removes named volumes and can delete the SQLite database and all persisted conversations. Do not use it unless you intend to erase the stored data.

## Database storage and backups

The documented local database default is:

```text
file:./data/wdmwd.db
```

The Docker configuration places the database under the container's persistent data directory. Confirm the exact `DATABASE_URL` and volume mount in `compose.yaml` before performing maintenance.

### Backup using Docker Compose

For a consistent file-level backup, stop the application first so SQLite can close and checkpoint its database files:

```bash
docker compose stop
```

Then copy the database from the service container. The following assumes the Compose service is named `wdmwd` and the database is `/app/data/wdmwd.db`, as described by the current deployment configuration:

```bash
docker compose cp wdmwd:/app/data/wdmwd.db ./wdmwd-backup.db
docker compose start
```

If the service name or container path differs in your checkout, use the values from `compose.yaml` and `DATABASE_URL`.

Store backups outside the repository if they contain conversation history or other private data. Do not commit database backups.

### Restore

1. Stop the application with `docker compose stop`.
2. Preserve a copy of the current database before replacing it.
3. Copy the backup to the exact database path used by the container.
4. Ensure file ownership and permissions allow the container process to access it.
5. Start the application with `docker compose start`.
6. Check `/api/health` and verify that the expected sessions are available.

Do not restore a database from an incompatible schema version without first checking the migration history.

## Migrations

### Docker

Pending migrations run automatically during application startup through the Node instrumentation path. No separate `drizzle-kit migrate` command is required in the container workflow described by the current implementation.

### Local development

Use the repository scripts:

```bash
npm run db:generate
npm run db:migrate
```

Run `db:generate` after making schema changes to generate migration files. Run `db:migrate` to apply pending migrations in the local environment.

Before deploying a version that includes database migrations, review the migration files and make a backup if the database contains data you need to preserve.

## Updating

Back up the database before an update, then pull the desired revision and rebuild:

```bash
git pull
docker compose up -d --build
```

Migrations run during container startup. Review the migration files for the revision being deployed, especially when they change or remove stored columns or tables.

## Remote or VPS deployment

WDMWD does not provide application-level user authentication. `REMOTE_ACCESS=true` is an explicit configuration opt-in, not a replacement for an access-control layer.

For a remotely hosted instance:

1. Keep the application bound to loopback on the host where possible.
2. Publish the app only to a local reverse-proxy interface.
3. Terminate HTTPS at the reverse proxy.
4. Add authentication at the proxy or another trusted access-control layer.
5. Restrict network access and keep the application and dependencies updated.
6. Do not expose the raw application port directly to the public internet.

The reverse proxy, TLS certificate, authentication, firewall, and remote-access policy are the operator's responsibility. Do not assume that enabling `REMOTE_ACCESS` configures any of them.

## Health monitoring

Use:

```text
GET /api/health
```

The endpoint returns an overall status and individual subsystem checks. The API reference documents the response fields and status semantics. Monitoring should inspect the response body rather than treating HTTP 200 alone as proof that every dependency is healthy.

## Troubleshooting

### Container is unhealthy

Inspect:

```bash
docker compose ps
docker compose logs --tail=200 wdmwd
```

Check required environment variables, database directory permissions, migration startup output, and the health response.

### Application refuses to start with a configuration error

Review `.env` against `.env.example`. Check the selected `AI_PROVIDER` and the matching provider key. Also verify the Base RPC/indexing configuration required by the current config schema.

### Chat requests are slow or fail

Check the configured AI provider's status, quota, rate limits, and model availability. Also inspect server logs for provider errors and request timeouts. Free-tier provider limits can affect response latency; do not assume a long wait is necessarily a frontend problem.

### Wallet history is incomplete

WDMWD depends on its configured RPC and indexing providers and their coverage. Check provider credentials, rate limits, supported transfer types, and the requested history range. Missing indexed data is not proof that no activity occurred.

### Docker daemon is unavailable

Start Docker Desktop on Windows/macOS, or start the Docker service using the instructions for your Linux distribution.
