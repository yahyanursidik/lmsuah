# Migration Plan

## Tooling
Drizzle Kit, SQL migration di Git, dan Neon branches.

## Rules
1. Jangan ubah production schema manual.
2. Satu perubahan logis per migration.
3. Uji pada branch kosong.
4. Pisahkan data migration berisiko.
5. Buat forward-fix/rollback plan.
6. Jalankan staging terlebih dahulu.
7. Runtime Function tidak memiliki DDL permission.
