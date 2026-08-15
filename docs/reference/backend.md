# Backend companion

The frontend is a static Vite app. The backend is optional.

**Repo:** `model-flight-recorder-backend`

## What it does

- `GET /health`
- `POST /api/receipts` — validate against the shared schema, store, return 201
- `GET /api/receipts/:runId` — fetch by id, or 404

Listens on `http://127.0.0.1:8787`. In-memory store, last 100 receipts, no
disk, no auth. Bodies over 64 KB are rejected.

## Schema sync

Both repos carry `receiptSchema.js`. When you bump
`RECEIPT_SCHEMA_VERSION` or change required fields, update **both** copies and
their tests.

## When you need it

Only when you want a local archive of exported FDRs. For day-to-day use of the
flight view and analytics, leave it stopped.
