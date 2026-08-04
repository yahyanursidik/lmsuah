# Neon Architecture

## Connection Model
Neon hanya diakses dari Netlify Functions menggunakan `@neondatabase/serverless`. Frontend tidak menerima connection string.

## ORM
Gunakan Drizzle ORM untuk schema, typed query, transaction, dan migration.

## Branch Strategy
- Development branch
- Staging branch
- Production branch
- Preview branch bila diperlukan

## Database Roles
- Migration/owner role
- Runtime application role dengan least privilege
- Read-only analytics role opsional

Runtime role tidak memiliki hak DDL.
