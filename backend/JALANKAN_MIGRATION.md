# Instruksi: Jalankan Migration Soft Delete

Buka terminal di folder backend, lalu jalankan:

```bash
cd D:\Project\IT_Asset_Management\backend
php artisan migrate
```

Migration yang akan dijalankan:
- `2026_06_09_000001_add_soft_deletes_to_remaining_tables.php`

Kolom `deleted_at` akan ditambahkan ke:
- `master_assets`
- `categories`
- `asset_properties`
- `audit_logs`

> Tabel `maintenance_logs` dan `asset_assignments` sudah punya `deleted_at` sebelumnya.
