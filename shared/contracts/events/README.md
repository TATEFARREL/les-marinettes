# Integration events

This directory contains **integration event schemas** exchanged over RabbitMQ.

Conventions:
- Messages are JSON.
- Each message has an envelope: `id`, `type`, `occurred_at`, `source`, `data`.
- `type` is a stable string, e.g. `finance.InvoiceCreated.v1`.

