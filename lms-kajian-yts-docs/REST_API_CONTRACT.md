# REST API Contract

## Base URL
`/api`

## Response
Success: `{ "data": ..., "meta": ... }`

Error: `{ "error": { "code": "FORBIDDEN", "message": "Akses tidak diizinkan", "requestId": "..." } }`

## Rules
- Zod validation
- Pagination
- Filter/sort allowlist
- Consistent status codes
- Request ID
- No stack trace to client
- Authorization on private endpoints

Custom Refine data provider menerjemahkan operasi CRUD ke endpoint REST.
