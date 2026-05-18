Audit dan fix semua tombol CRUD yang belum berfungsi di aplikasi WMS ini.
Selesaikan sampai 100% working — bukan partial, bukan placeholder.

═══════════════════════════════════════════════
LANGKAH 1 — AUDIT SEMUA CRUD
═══════════════════════════════════════════════

Cek setiap file page dan komponen, catat mana yang:
- Tombol onClick belum ada handler
- Handler ada tapi tidak konek ke API
- API call ada tapi endpoint backend belum ada
- Form submit tidak melakukan apa-apa
- Modal tidak terbuka saat tombol diklik
- Delete tidak ada confirm dialog
- Edit tidak load data existing ke form

Jalankan grep untuk temukan semua TODO/placeholder:
grep -rn "TODO\|console.log\|placeholder\|coming soon\|not implemented" src/ --include="*.tsx" --include="*.ts"

═══════════════════════════════════════════════
LANGKAH 2 — FIX PATTERN UNTUK SETIAP CRUD
═══════════════════════════════════════════════

Setiap modul CRUD harus mengikuti pattern ini PERSIS:

──────────────────────────────────────────────
PATTERN TAMBAH (Create)
──────────────────────────────────────────────
1. Tombol [+ Tambah] → buka Modal form
2. Form pakai React Hook Form + Zod validation
3. Submit → POST /api/{resource}
4. Success → tutup modal + invalidate query (refresh tabel otomatis)
5. Error → tampilkan pesan error di dalam modal (toast + inline)
6. Loading state → tombol submit disabled + text "Menyimpan..."
7. TIDAK redirect halaman

──────────────────────────────────────────────
PATTERN EDIT (Update)
──────────────────────────────────────────────
1. Tombol [✏️ Edit] di baris tabel → buka Modal form
2. Form PRE-FILLED dengan data baris yang diklik
3. Submit → PUT /api/{resource}/{id}
4. Success → tutup modal + refresh tabel
5. Error → tampilkan error di modal
6. Loading → tombol disabled

──────────────────────────────────────────────
PATTERN HAPUS (Delete)
──────────────────────────────────────────────
1. Tombol [🗑 Hapus] → buka ConfirmDialog
2. Dialog tampilkan: "Hapus [nama item]? Tindakan ini tidak dapat dibatalkan."
3. Tombol: [Batal] [Hapus] (merah)
4. Konfirm → DELETE /api/{resource}/{id}
5. Success → tutup dialog + refresh tabel + toast "Berhasil dihapus"
6. Error → toast error, dialog tetap terbuka

──────────────────────────────────────────────
PATTERN TOGGLE STATUS (Aktif/Nonaktif)
──────────────────────────────────────────────
1. Toggle switch atau tombol di tabel
2. PATCH /api/{resource}/{id}/status
3. Optimistic update — langsung update UI
4. Rollback jika error

═══════════════════════════════════════════════
LANGKAH 3 — FIX PER MODUL (SETTINGS)
═══════════════════════════════════════════════

──────────────────────────────────────────────
GUDANG (src/app/(app)/settings/warehouses/page.tsx)
──────────────────────────────────────────────
Tombol yang harus berfungsi:
[+ Tambah Gudang] → Modal form fields:
  - Kode Gudang* (uppercase, max 10 char)
  - Nama Gudang*
  - Alamat (textarea)
  - Telepon
  - Status (toggle Aktif)
  Endpoint: POST /api/warehouses

[✏️ Edit] → Modal form pre-filled
  Endpoint: PUT /api/warehouses/:id

[🗑 Hapus] → ConfirmDialog
  Endpoint: DELETE /api/warehouses/:id
  Cek: jika masih punya zona aktif → tampilkan error "Hapus zona dulu"

──────────────────────────────────────────────
ZONA (dalam detail Gudang atau halaman terpisah)
──────────────────────────────────────────────
[+ Tambah Zona] → Modal:
  - Kode Zona* (unik per gudang)
  - Nama Zona*
  Endpoint: POST /api/warehouses/:warehouseId/zones

[✏️ Edit Zona] → PUT /api/zones/:id
[🗑 Hapus Zona] → DELETE /api/zones/:id

──────────────────────────────────────────────
RAK & BIN
──────────────────────────────────────────────
Sama seperti Zona tapi nested:
POST /api/zones/:zoneId/racks
POST /api/racks/:rackId/bins

──────────────────────────────────────────────
SUPPLIER (src/app/(app)/settings/suppliers/page.tsx)
──────────────────────────────────────────────
[+ Tambah Supplier] → Modal form:
  - Kode* (auto-generate atau manual, uppercase)
  - Nama Supplier*
  - Nama Kontak
  - Telepon
  - Email
  - Alamat (textarea)
  - Status (toggle)
  Endpoint: POST /api/suppliers

[✏️ Edit] → PUT /api/suppliers/:id
[🗑 Hapus] → DELETE /api/suppliers/:id
  Cek: jika ada PO aktif → error "Supplier masih punya PO aktif"

──────────────────────────────────────────────
CUSTOMER (src/app/(app)/settings/customers/page.tsx)
──────────────────────────────────────────────
Sama seperti Supplier:
POST/PUT/DELETE /api/customers/:id
Cek hapus: jika ada SO aktif → error

──────────────────────────────────────────────
KATEGORI (src/app/(app)/settings/categories/page.tsx)
──────────────────────────────────────────────
[+ Tambah Kategori] → Modal:
  - Kode* (uppercase)
  - Nama*
  - Parent Kategori (SearchAutocomplete, optional — untuk sub-kategori)
  Endpoint: POST /api/categories

Tampilkan sebagai tree table (parent → children indent)
[✏️ Edit] → PUT /api/categories/:id
[🗑 Hapus] → DELETE /api/categories/:id
  Cek: jika punya produk → error "Pindahkan produk dulu"

──────────────────────────────────────────────
SATUAN (src/app/(app)/settings/units/page.tsx)
──────────────────────────────────────────────
[+ Tambah Satuan] → Modal:
  - Kode* (misal: PCS, KG, LTR)
  - Nama* (misal: Pieces, Kilogram, Liter)
  Endpoint: POST /api/units

[✏️ Edit] → PUT /api/units/:id
[🗑 Hapus] → DELETE /api/units/:id

──────────────────────────────────────────────
USER (src/app/(app)/settings/users/page.tsx)
──────────────────────────────────────────────
[+ Tambah User] → Modal:
  - Nama Lengkap*
  - Email* (validasi format email)
  - Password* (min 8 char, show/hide)
  - Role* (dropdown: SUPER_ADMIN|ADMIN|MANAGER|OPERATOR|VIEWER)
  - Gudang (SearchAutocomplete, optional)
  - Status (toggle)
  Endpoint: POST /api/users

[✏️ Edit] → PUT /api/users/:id (password kosong = tidak diubah)
[🗑 Hapus] → DELETE /api/users/:id
  Cek: tidak bisa hapus user yang sedang login

[🔑 Reset Password] → Modal input password baru
  Endpoint: POST /api/users/:id/reset-password

═══════════════════════════════════════════════
LANGKAH 4 — FIX CRUD PRODUK
═══════════════════════════════════════════════

src/app/(app)/products/page.tsx:
[+ Tambah Produk] → navigasi ke /products/new (bukan modal, karena form panjang)

src/app/(app)/products/new/page.tsx:
Form submit → POST /api/products
Success → redirect ke /products dengan toast "Produk berhasil ditambahkan"
[Simpan & Baru] → POST lalu reset form (tetap di halaman /new)

src/app/(app)/products/[id]/page.tsx:
[Edit] → enable form editing (mode edit)
[Simpan Perubahan] → PUT /api/products/:id
[Hapus] → ConfirmDialog → DELETE → redirect /products

═══════════════════════════════════════════════
LANGKAH 5 — FIX CRUD PURCHASE ORDER
═══════════════════════════════════════════════

src/app/(app)/purchase-orders/new/page.tsx:
[Simpan Draft] → POST /api/purchase-orders {status: 'DRAFT'}
[Submit] → POST /api/purchase-orders {status: 'SUBMITTED'}
  atau POST /api/purchase-orders lalu POST /api/purchase-orders/:id/submit
Success → redirect /purchase-orders/:id

src/app/(app)/purchase-orders/[id]/page.tsx:
[Submit] → POST /api/purchase-orders/:id/submit
[Approve] → POST /api/purchase-orders/:id/approve
[Batalkan] → POST /api/purchase-orders/:id/cancel dengan ConfirmDialog
[Terima Barang] → buka Modal GoodsReceipt:
  - Tabel item: input qty diterima per item
  - Pilih bin tujuan per item (SearchAutocomplete)
  - Input batch no & expiry (optional)
  - Submit → POST /api/purchase-orders/:id/receive
  - Success → refresh halaman + update status PO

═══════════════════════════════════════════════
LANGKAH 6 — FIX CRUD SALES ORDER
═══════════════════════════════════════════════

src/app/(app)/sales-orders/new/page.tsx:
[Simpan Draft] → POST /api/sales-orders {status: 'DRAFT'}
[Konfirmasi] → POST + submit
Success → redirect /sales-orders/:id

src/app/(app)/sales-orders/[id]/page.tsx:
[Konfirmasi] → POST /api/sales-orders/:id/confirm
[Buat Picking] → POST /api/sales-orders/:id/picking
[Tandai Terkirim] → POST /api/sales-orders/:id/ship
[Batalkan] → ConfirmDialog → POST /api/sales-orders/:id/cancel

═══════════════════════════════════════════════
LANGKAH 7 — FIX TRANSFER & ADJUSTMENT
═══════════════════════════════════════════════

src/app/(app)/transfers/new/page.tsx:
[Proses Transfer] → POST /api/transfers
Validasi frontend:
  - Qty > 0
  - Qty <= stok tersedia di Dari Bin
  - Dari Bin ≠ Ke Bin
Success → redirect /transfers dengan toast

src/app/(app)/adjustments/new/page.tsx:
[Simpan Draft] → POST /api/adjustments {status: 'DRAFT'}
[Submit Approval] → POST /api/adjustments lalu submit

src/app/(app)/adjustments/[id]/page.tsx:
[Approve] → POST /api/adjustments/:id/approve
[Tolak] → POST /api/adjustments/:id/reject dengan input alasan

═══════════════════════════════════════════════
LANGKAH 8 — KOMPONEN SHARED YANG HARUS ADA
═══════════════════════════════════════════════

Pastikan komponen ini exist dan reusable:

src/components/modals/CrudModal.tsx
  Props: isOpen, onClose, title, children, onSubmit, isLoading
  - Trap focus saat modal terbuka
  - Escape key untuk close
  - Klik backdrop untuk close (optional, bisa dikonfigurasi)

src/components/modals/ConfirmDialog.tsx
  Props: isOpen, onClose, onConfirm, title, message, isLoading
  - Tombol Hapus: merah, disabled saat loading
  - Tombol Batal: secondary
  - Enter key = konfirm, Escape = batal

src/components/ui/Toast.tsx (atau pakai react-hot-toast)
  - Success: hijau, ikon centang
  - Error: merah, ikon X
  - Auto dismiss 3 detik
  - Posisi: top-right

src/lib/api.ts — pastikan semua method ada:
  export const api = {
    get: (url) => axios.get(url),
    post: (url, data) => axios.post(url, data),
    put: (url, data) => axios.put(url, data),
    patch: (url, data) => axios.patch(url, data),
    delete: (url) => axios.delete(url),
  }
  
  Interceptor:
  - Request: tambah Authorization header dari token
  - Response 401: redirect ke /login + clear token
  - Response 422: throw error dengan pesan validasi dari server
  - Response 500: throw error "Terjadi kesalahan server"

═══════════════════════════════════════════════
LANGKAH 9 — BACKEND: PASTIKAN ENDPOINT ADA
═══════════════════════════════════════════════

Cek backend, pastikan semua endpoint ini exist dan berfungsi:

GET    /api/warehouses
POST   /api/warehouses
PUT    /api/warehouses/:id
DELETE /api/warehouses/:id

GET    /api/suppliers
POST   /api/suppliers
PUT    /api/suppliers/:id
DELETE /api/suppliers/:id

GET    /api/customers
POST   /api/customers
PUT    /api/customers/:id
DELETE /api/customers/:id

GET    /api/categories
POST   /api/categories
PUT    /api/categories/:id
DELETE /api/categories/:id

GET    /api/units
POST   /api/units
PUT    /api/units/:id
DELETE /api/units/:id

GET    /api/users
POST   /api/users
PUT    /api/users/:id
DELETE /api/users/:id
POST   /api/users/:id/reset-password

GET    /api/products
POST   /api/products
PUT    /api/products/:id
DELETE /api/products/:id

GET    /api/purchase-orders
POST   /api/purchase-orders
PUT    /api/purchase-orders/:id
POST   /api/purchase-orders/:id/submit
POST   /api/purchase-orders/:id/approve
POST   /api/purchase-orders/:id/cancel
POST   /api/purchase-orders/:id/receive

GET    /api/sales-orders
POST   /api/sales-orders
PUT    /api/sales-orders/:id
POST   /api/sales-orders/:id/confirm
POST   /api/sales-orders/:id/picking
POST   /api/sales-orders/:id/ship
POST   /api/sales-orders/:id/cancel

POST   /api/transfers
GET    /api/transfers

GET    /api/adjustments
POST   /api/adjustments
POST   /api/adjustments/:id/submit
POST   /api/adjustments/:id/approve
POST   /api/adjustments/:id/reject

Untuk setiap endpoint yang BELUM ADA di backend:
- Buat route file di src/modules/{resource}/
- Buat controller dengan try/catch
- Validasi input dengan Zod
- Return format konsisten:
  Success: { success: true, data: {...}, message: "..." }
  Error:   { success: false, error: "...", details: [...] }

═══════════════════════════════════════════════
LANGKAH 10 — TEST & VERIFIKASI
═══════════════════════════════════════════════

Setelah semua fix, test manual setiap operasi:

SETTINGS:
[ ] Tambah gudang baru → muncul di tabel ✓
[ ] Edit gudang → data berubah ✓
[ ] Hapus gudang → hilang dari tabel ✓
[ ] Tambah supplier → muncul ✓
[ ] Edit supplier → berubah ✓
[ ] Hapus supplier → hilang ✓
[ ] Tambah customer → muncul ✓
[ ] Tambah kategori dengan parent → hierarki benar ✓
[ ] Tambah satuan → muncul ✓
[ ] Tambah user → muncul, bisa login ✓

PRODUK:
[ ] Tambah produk baru → muncul di list ✓
[ ] Edit produk → data update ✓
[ ] Hapus produk → hilang ✓

PURCHASE ORDER:
[ ] Buat PO draft → tersimpan ✓
[ ] Submit PO → status berubah SUBMITTED ✓
[ ] Approve PO → status APPROVED ✓
[ ] Terima barang → stok bertambah, movement tercatat ✓

SALES ORDER:
[ ] Buat SO → tersimpan ✓
[ ] Konfirmasi → status CONFIRMED ✓
[ ] Picking → stok berkurang ✓

TRANSFER:
[ ] Transfer bin → stok pindah, movement tercatat ✓

ADJUSTMENT:
[ ] Buat opname → tersimpan draft ✓
[ ] Approve → stok disesuaikan ✓

Jika semua checklist ✓ → 
git add .
git commit -m "fix: semua CRUD berfungsi end-to-end"
git push
