# plan+reminder.md

## 🚨 DEVELOPER REMINDERS & STRICT CONSTRAINTS 🚨

Bagian ini memuat aturan mutlak yang **TIDAK BOLEH** dilanggar oleh *coder* atau AI *assistant* selama proses penulisan kode:

1.  **NO LIVE EXECUTION:** Posisi *environment* saat ini bukan di *home lab* utama. **Dilarang keras** melakukan eksekusi server (`app.listen`), melakukan uji coba *live*, atau mengeksekusi mutasi database secara mandiri. Fokus 100% pada penulisan struktur kode sumber (*source code/blueprint*).
2.  **DATABASE POOLING STRICT MATCH:** Wajib menggunakan *script* koneksi MySQL persis seperti di bawah ini tanpa mengubah *fallback default*-nya:
```javascript
    const mysql = require('mysql2/promise');
    require('dotenv').config();

    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || 'Adminsql',
      database: process.env.DB_NAME || 'report_omset',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4',
      timezone: '+08:00'
    });

    module.exports = pool;
    ```
3.  **SEPARATION OF CONCERNS:** Pecah kode ke dalam arsitektur modular (MVC atau *Service-based*): `db.js`, `scraperService.js`, `apiService.js`, `reportController.js`, dan `routes.js`.
4.  **BILLIARD IS A SUBSET:** Ingat aturan bisnis utama: Omset Billiard **BUKAN** omset tambahan. Ia adalah **ekstraksi porsi** dari Grand Total Omset, yang diidentifikasi murni melalui nama kasir.
5.  **ERROR HANDLING:** Pastikan ada *try-catch* yang solid, terutama pada *service* API dan Scraping. Jangan biarkan aplikasi *crash* jika struktur DOM Olsera berubah; kembalikan respons JSON berisi pesan *error* yang informatif ke *frontend*.

---

## 1. Konsep Utama & Arsitektur
Web App (*Full-Stack*) untuk otomatisasi penarikan data penjualan dari Olsera POS, agregasi data berdasarkan aturan bisnis spesifik (Porsi Billiard, Pembagian Bar vs Dapur), dan penyajian dalam *dashboard*.

*   **Backend:** Node.js + Express.js.
*   **Database:** MySQL (`mysql2/promise`).
*   **Scraping Engine:** Puppeteer / Playwright (*Headless*).
*   **Frontend:** HTML/JS Vanilla / Bootstrap (untuk *Dashboard* & *Settings*).

---

## 2. Skema Database (Tabel Master)

**A. `categories`**
Menyimpan *mapping* referensi kategori.
*   `id` (INT, PK, Auto Increment)
*   `olsera_group_id` (VARCHAR) -> *Contoh: '4612994'*
*   `category_name` (VARCHAR) -> *Contoh: 'Signature'*
*   `production_area` (ENUM: 'Bar', 'Dapur')
*   `item_type` (ENUM: 'Minuman', 'Makanan')

**B. `billiard_cashiers`**
Menyimpan nama kasir referensi untuk ekstraksi omset.
*   `id` (INT, PK, Auto Increment)
*   `cashier_name` (VARCHAR) -> *Contoh: 'Otniel'*

**C. `app_settings`**
Menyimpan state token JWT agar tidak perlu scraping setiap saat.
*   `setting_key` (VARCHAR, PK) -> *'olsera_token'*
*   `setting_value` (TEXT)
*   `last_updated` (DATETIME)

---

## 3. Workflow Autentikasi & Data Fetching

### Tahap 1: Smart Auth (Token & Fallback)
1.  Ambil `olsera_token` dari database.
2.  Lakukan *test request* ke Olsera API.
3.  **Jika 401/403/Gagal:** Panggil *Scraper Service*.
    *   Buka halaman login Olsera secara *headless*.
    *   Input: `ardiantopreffi@gmail.com` dan *password* dari `.env`.
    *   Tangkap *Bearer Token* dari *Network* atau *Local Storage*.
    *   Simpan (Update) token ke `app_settings`.

### Tahap 2: Fetching Olsera API
1.  Terima param `from` dan `to` dari *user* (Default: awal bulan s/d hari ini).
2.  `SELECT olsera_group_id FROM categories`.
3.  Lakukan iterasi (disarankan `Promise.all`) `GET` request ke Olsera untuk **setiap ID Kategori**:
    *   `GET .../api/.../salesitemsbydate?page=1&per_page=1000&from={from}&to={to}&group_id={id}`
4.  Kumpulkan semua *response array* menjadi satu `masterData` array di memori Node.js.

---

## 4. Logika Agregasi & Aturan Bisnis (Core Logic)

Lakukan satu kali *looping* komprehensif pada `masterData` untuk menghasilkan output berikut:

*   **Total Omset (Grand Total):** Jumlahkan `amount` dari **seluruh** baris.
*   **Porsi Omset Billiard:**
    *   `IF row.sales_name IN billiard_cashiers` -> Tambahkan `amount` ke `porsi_billiard`.
*   **Pembagian Produksi (Bar vs Dapur):**
    *   Cocokkan `row.item_group` dengan tabel `categories`.
    *   Akumulasikan ke `total_bar` atau `total_dapur` sesuai kecocokan.
*   **Top 10 Ranking:**
    *   Kelompokkan `qty` berdasarkan `item_name`.
    *   Pisahkan menjadi dua *array* objek berdasarkan `item_type` (Makanan & Minuman).
    *   *Sort Descending* berdasarkan `qty`, lalu `.slice(0, 10)`.

---

## 5. Rencana UI / Frontend

**A. Dashboard Laporan**
*   **Input Area:** Pemilihan Tanggal (`from` - `to`) & Tombol Eksekusi.
*   **Summary Cards:**
    1.  **GRAND TOTAL OMSET**
    2.  **PORSI BILLIARD** *(Beri sub-teks: "Porsi dari Grand Total")*
    3.  **TOTAL BAR**
    4.  **TOTAL DAPUR**
*   **Ranking Tables:**
    *   Tabel Top 10 Minuman.
    *   Tabel Top 10 Makanan.

**B. Halaman Settings (CRUD Panel)**
*   **Manajemen Kategori:** Form untuk melakukan Insert, Update, Delete data kategori beserta *mapping* Olsera ID, Bar/Dapur, dan Makanan/Minuman.
*   **Manajemen Kasir Billiard:** Form simpel untuk menambah atau menghapus nama kasir spesifik.