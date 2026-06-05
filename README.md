# Omset Olsera Dashboard

Blueprint aplikasi full-stack untuk menarik data penjualan Olsera, mengagregasi omset sesuai aturan bisnis, dan menampilkan dashboard laporan.

## Batasan Kerja

Sesuai `plan+reminder.md`, environment ini hanya digunakan untuk penulisan source code. Jangan menjalankan server, scraping live, atau mutasi database dari mesin ini.

## Struktur

```text
src/
  app.js
  config/db.js
  controllers/reportController.js
  routes.js
  services/apiService.js
  services/reportService.js
  services/scraperService.js
public/
  dashboard.html
  settings.html
  js/
  css/
sql/
  schema.sql
```

## Persiapan di Home Lab

1. Install dependency:

```bash
npm install
```

2. Buat database dan tabel memakai `sql/schema.sql`. Gunakan `sql/seed.example.sql` sebagai contoh format seed.
3. Salin `.env.example` menjadi `.env`, lalu isi `OLSERA_PASSWORD` dan sesuaikan endpoint Olsera jika diperlukan.
4. Jalankan aplikasi hanya di environment home lab:

```bash
npm start
```

## Endpoint

- `GET /api/report?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/settings/olsera-token/status`
- `POST /api/settings/olsera-token` dengan header `X-Worker-Key`
- `GET /api/settings/categories`
- `POST /api/settings/categories`
- `PUT /api/settings/categories/:id`
- `DELETE /api/settings/categories/:id`
- `GET /api/settings/billiard-cashiers`
- `POST /api/settings/billiard-cashiers`
- `DELETE /api/settings/billiard-cashiers/:id`

## Aturan Bisnis Utama

Omset Billiard adalah porsi yang diekstraksi dari Grand Total berdasarkan nama kasir, bukan omset tambahan. Grand Total tetap berasal dari seluruh baris data.

## Deploy di HG680P

Path target:

```bash
/DATA/AppData/Apache/omset
```

Import database:

```bash
docker exec -i mariadb mariadb -u root -pAdminsql < /DATA/AppData/Apache/omset/sql/schema.sql
```

Install dan jalankan:

```bash
cd /DATA/AppData/Apache/omset
npm install
npm run check
pm2 start src/app.js --name omset-dashboard
pm2 save
```

## GitHub Actions Worker

Repo SSH:

```bash
git@github.com:CapinzoMVP/omset.git
```

Worker ada di:

```text
.github/workflows/refresh-olsera-token.yml
worker/get-olsera-token.js
```

Tambahkan repository secrets di GitHub:

```text
OLSERA_EMAIL
OLSERA_PASSWORD
OLSERA_LOGIN_URL
OMSET_APP_URL
WORKER_KEY
```

Contoh:

```text
OMSET_APP_URL=https://omset.domainkamu.com
WORKER_KEY=rahasia-panjang-random
```

`OMSET_APP_URL` harus mengarah ke app STB, misalnya lewat Cloudflare Tunnel ke `http://localhost:3000`. Nilai `WORKER_KEY` di GitHub harus sama dengan `WORKER_KEY` di file `.env` STB.

Workflow bisa dijalankan manual dari tab GitHub Actions, dan juga otomatis tiap 6 jam.
