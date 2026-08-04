# Security

## Secrets Server-Only
`DATABASE_URL`, auth secret, Google OAuth secret, Turnstile secret, email secret, dan credential administratif.

## API Security
Session verification, permission middleware, Zod validation, rate limiting, CSRF protection, secure cookie, CORS allowlist, safe errors, dan audit log.

## Database Security
Runtime role least privilege, migration role terpisah, parameterized query via Drizzle, transaction, dan optional RLS.

## File Security
MIME + magic byte validation, size limit, randomized key, SHA-256, authenticated endpoint, no listing.

## Threats
IDOR, privilege escalation, session theft, malicious PDF, score manipulation, answer leakage, SQL injection, OAuth redirect abuse, dan secret exposure.
