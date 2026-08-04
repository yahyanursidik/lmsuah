# Database Authorization and Optional RLS Plan

Neon tidak diakses langsung oleh browser. Pengamanan utama berada pada Netlify Functions dan query scoping.

PostgreSQL RLS dapat digunakan sebagai defense-in-depth pada tabel sensitif setelah pola transaction context teruji. Jangan mengandalkan RLS tanpa session verification dan endpoint authorization.

Gunakan runtime database role tanpa hak DDL dan migration role terpisah.
