# OneSight WMS dashboard Worker

Read-only Cloudflare Worker that combines the Caspio WMS tables into one
exception-oriented dashboard response.

## Routes

- `GET /health` returns service health without touching Caspio.
- `GET /dashboard` returns the dashboard payload for an allowed frontend
  origin. Add `?refresh=1` to bypass the 60-second edge cache.
- `GET /purchase-orders/:id/receiving-progress` returns PO status, ordered,
  received, calculated pending, completed-line, and latest receipt activity
  metrics.

## Credentials

The deployed Worker requires these encrypted secrets:

- `CASPIO_READONLY_CLIENT_ID`
- `CASPIO_READONLY_CLIENT_SECRET`

Never use the Square import credentials. Never commit either value.

## Local checks

Run the aggregation tests from the repository root:

```powershell
node --test cloudflare/dashboard-worker/test/dashboard.test.mjs
```

Wrangler uses the repository root `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID` environment values for deployment. Caspio secrets are
uploaded through Wrangler and remain encrypted in Cloudflare.
