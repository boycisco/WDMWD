# Deployment

WDMWD runs as a single Node.js process. There is no external queue, cache, or database server to provision. The only state is a SQLite file on disk.

---

## Local development

See the README quick start. The essentials:

```bash
npm install
cp .env.example .env
# edit .env — set BASE_RPC_URL, GEMINI_API_KEY, ALCHEMY_API_KEY
npm run db:migrate
npm run dev
```

Dev server binds to `127.0.0.1:3000` by default. Only your machine can reach it.

## Docker (recommended for self-hosting)

`compose.yaml` provides a single-container deployment with a persistent named volume for the SQLite database.

```bash
cp .env.example .env
# edit .env with your real keys
docker compose up -d
```

On first start, the container runs pending database migrations automatically, then starts the Next.js server.

Verifying it's up:

```bash
docker compose ps         # should show "healthy"
curl http://127.0.0.1:3000/api/health
```

Logs:

```bash
docker compose logs -f wdmwd
```

Stopping (graceful — SQLite closes cleanly on SIGTERM):

```bash
docker compose stop
```

Destroying (keeps the database volume):

```bash
docker compose down
```

Destroying everything (DELETES the SQLite database):

```bash
docker compose down -v
```

Why the port bind is `127.0.0.1:3000:3000`: Docker's port mapping can be scoped to a specific host interface. Binding to `127.0.0.1` on the host means the container is unreachable from your LAN or the internet, even though the container itself listens on `0.0.0.0` internally.

Why `HOST: "0.0.0.0"` inside the container: Next.js needs to listen on all interfaces inside the container's network namespace for the Docker port-forwarder to reach it. The host-side `127.0.0.1` bind is what provides network isolation.

## Remote / VPS deployment

Read [SECURITY.md](../SECURITY.md) before doing this. WDMWD does not ship authentication. Exposing it to the internet requires additional infrastructure.

The correct pattern is:

- Bind WDMWD to loopback on the host — do not change ports: `"127.0.0.1:3000:3000"` in `compose.yaml`.
- Run a reverse proxy on the same host — Caddy, nginx, or Traefik.
- Terminate TLS at the proxy — Let's Encrypt via Caddy is one line of config.
- Add authentication at the proxy — HTTP Basic, OAuth proxy, mTLS. Choose one. WDMWD has no opinion.

Minimal Caddy example (with HTTP Basic auth):

```caddy
wdmwd.example.com {
  basicauth {
    admin $2a$14$...  # generate: caddy hash-password
  }
  reverse_proxy 127.0.0.1:3000
}
```

Then point your DNS A/AAAA record at the VPS. Caddy handles Let's Encrypt automatically.

Do not expose port 3000 directly from a VPS. There is no rate limit, no auth, no CSRF protection at the WDMWD layer — because it was never meant to be on the public internet without a proxy.

## Environment

All configuration is via environment variables. See `.env.example` and the README for the full table.

Production requirements (enforced by config validation at startup):

- `NODE_ENV=production`
- Either `BASE_RPC_URL` or `ALCHEMY_API_KEY` (for Base data)
- Either `GEMINI_API_KEY` (if `AI_PROVIDER=gemini`) or `OPENAI_API_KEY` (if `openai`)

If any required value is missing, the app will not start. This is deliberate — silent fallbacks are worse than a loud startup failure.

## Database

WDMWD uses SQLite via `better-sqlite3`. The file lives at `DATABASE_URL` (default `file:./data/wdmwd.db`).

Backup:

```bash
docker compose exec wdmwd sh -c "sqlite3 /app/data/wdmwd.db '.backup /app/data/backup.db'"
docker compose cp wdmwd:/app/data/backup.db ./backup.db
docker compose exec wdmwd rm /app/data/backup.db
```

Or simpler: `docker cp wdmwd:/app/data/wdmwd.db ./wdmwd.db` while the container is running — WAL mode means reads don't block writes, so the copy is consistent.

Migration:

Migrations run automatically on container start (`npx drizzle-kit migrate && node server.js`). If you're running outside Docker:

```bash
npm run db:generate   # after schema changes only — produces new SQL files
npm run db:migrate    # applies pending migrations
```

Reset (destroys data):

```bash
docker compose down -v
```

## Updating

```bash
git pull
docker compose build
docker compose up -d
```

Migrations run automatically on start. No manual intervention needed unless a migration is destructive — check `drizzle/*.sql` before pulling if you care about your conversation history.

## Health monitoring

The health check hits `GET /api/health` and expects `200` with `status: "ok"`. If you're running the container without `compose.yaml`, wire an external monitor to the same endpoint.

The health check does not hit Base or Gemini on every call — it checks configuration and does a local SQLite query. This means it stays cheap. If you want active provider checks, hit `/api/wallet/[any-valid-address]` on a schedule, but be aware it uses Alchemy quota.