# Gateway

This is the **API gateway + web host** for Les Marinettes:
- Hosts the public HTML pages and `/admin` SPA
- Reverse-proxies `/api/*` to backend services

In the first migration phase, the gateway proxies all `/api/*` to the legacy monolith.

