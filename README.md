# RakitPro — Portofolio PC Seller

Website portofolio penjualan unit PC rakitan. Ada dua sisi:

- **Publik** — pengunjung bisa melihat daftar unit PC yang pernah/sedang dijual, lengkap dengan foto, spesifikasi, harga terjual, bukti transaksi (chat/bukti transfer), dan tombol kontak WhatsApp langsung.
- **Admin** — Anda login untuk menambah, mengedit, menghapus unit PC beserta foto-fotonya (bisa drag & drop atau tempel langsung dari clipboard).

- **Frontend** — React + Vite, jalan di `http://localhost:5173`
- **Backend** — Express (Node.js), jalan di `http://localhost:4000`
- **Database & penyimpanan foto** — Supabase (PostgreSQL + Storage)

---

## Daftar isi

1. [Prasyarat](#1-prasyarat)
2. [Setup Supabase (database + storage)](#2-setup-supabase-database--storage)
3. [Konfigurasi `.env`](#3-konfigurasi-env)
4. [Menjalankan project](#4-menjalankan-project)
5. [Daftar perintah](#5-daftar-perintah)
6. [Cara pakai](#6-cara-pakai)
7. [Struktur folder](#7-struktur-folder)
8. [Ganti nama brand / nomor WhatsApp](#8-ganti-nama-brand--nomor-whatsapp)
9. [Sesi login admin (sliding session)](#9-sesi-login-admin-sliding-session)
10. [Upload foto: drag & drop, tempel, atau pilih file](#10-upload-foto-drag--drop-tempel-atau-pilih-file)
11. [Keamanan yang diterapkan](#11-keamanan-yang-diterapkan)
12. [Rencana deploy ke Vercel + Supabase](#12-rencana-deploy-ke-vercel--supabase)
13. [Kalau ada error](#13-kalau-ada-error)

---

## 1. Prasyarat

Install dulu di komputer Anda:

- **Node.js** versi 18 atau lebih baru — cek dengan `node -v`. Unduh di https://nodejs.org jika belum ada.
- Akun **Supabase** gratis — daftar di https://supabase.com

---

## 2. Setup Supabase (database + storage)

1. Login ke https://supabase.com/dashboard, klik **New Project**.
   - Isi nama project bebas, buat password database (simpan baik-baik), pilih region terdekat (misal Singapore).
   - Tunggu beberapa menit sampai project selesai dibuat.

2. **Buat tabel database**:
   - Di dashboard project, buka menu **SQL Editor** (ikon di sidebar kiri).
   - Klik **New query**.
   - Buka file [`supabase/schema.sql`](./supabase/schema.sql) di project ini, salin seluruh isinya, tempel ke SQL Editor.
   - Klik **Run**. Jika berhasil akan muncul "Success. No rows returned".

3. **Buat storage bucket** (untuk simpan foto):
   - Ikuti panduan di [`supabase/storage-setup.md`](./supabase/storage-setup.md) (intinya: buat bucket bernama `pc-portfolio-media`, set jadi public).

4. **Ambil kredensial API**:
   - Buka menu **Project Settings** (ikon gear) → **API**.
   - Catat dua nilai ini:
     - **Project URL** — bentuknya `https://xxxxx.supabase.co`. **Ambil persis sampai `.supabase.co` saja**, jangan sertakan `/rest/v1/` atau path lain di belakangnya.
     - **service_role key** (di bagian "Project API keys" — klik "Reveal" untuk melihatnya). **Bukan** `anon public` key.
   - ⚠️ **PENTING**: `service_role key` ini setara kunci master ke database Anda. **JANGAN PERNAH** dimasukkan ke kode frontend, dishare ke publik, atau di-commit ke Git. Hanya dipakai di file `server/.env`.

   > Catatan: halaman **"JWT Keys" / "Legacy JWT Secret"** di Supabase (menu Project Settings → JWT Keys) **tidak dipakai sama sekali** di project ini — itu untuk fitur Supabase Auth bawaan, sedangkan login admin di sini pakai sistem sendiri (tabel `admins` + JWT yang di-generate backend). Abaikan halaman itu.

---

## 3. Konfigurasi `.env`

Dua file `.env` diisi manual dan **tidak boleh masuk ke Git** (sudah diatur di `.gitignore`).

**`server/.env`** — salin dari `server/.env.example`:

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=isi-service-role-key-dari-langkah-2

JWT_SECRET=isi-string-acak-panjang-di-sini
JWT_EXPIRES_IN=604800        # satuan DETIK. 86400 = 1 hari, 604800 = 7 hari

ADMIN_USERNAME=admin
ADMIN_PASSWORD=BuatPasswordKuatDanUnik123!

PORT=4000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173
```

Untuk `JWT_SECRET`, generate string acak yang aman:

```bash
openssl rand -hex 64
```

Salin hasilnya ke `JWT_SECRET`. Ini string yang **Anda buat sendiri secara lokal** — tidak ada hubungannya dengan Supabase, tidak perlu didaftarkan ke mana pun.

**`client/.env`** — salin dari `client/.env.example`:

```env
VITE_API_URL=http://localhost:4000/api
```

Default ini sudah benar untuk development lokal, tidak perlu diubah.

---

## 4. Menjalankan project

Semua perintah dijalankan dari **folder utama** project ini (folder yang berisi `client/`, `server/`, `package.json`). Tidak perlu masuk ke `client/` atau `server/` secara terpisah, dan tidak perlu dua terminal.

```bash
npm install     # sekali saja — install dependency server + client sekaligus
npm run seed:admin   # sekali saja — buat akun admin pertama di Supabase
npm run dev     # nyalakan backend + frontend bersamaan
```

Kalau berhasil, output-nya seperti ini:

```
  Menjalankan backend + frontend. Tekan Ctrl+C untuk berhenti.

[SERVER] Server berjalan di http://localhost:4000
[CLIENT]   VITE v5.4.21  ready in 581 ms
[CLIENT]   ->  Local:   http://localhost:5173/
```

Buka **http://localhost:5173** di browser.

- Halaman utama (`/`) — tampilan publik, portofolio unit PC.
- Halaman `/admin/login` — login pakai `ADMIN_USERNAME` dan `ADMIN_PASSWORD` dari `server/.env`.

Tekan **Ctrl+C sekali** untuk mematikan backend dan frontend sekaligus — termasuk proses turunannya, jadi port 4000 dan 5173 langsung bebas lagi (tidak perlu kill manual).

---

## 5. Daftar perintah

Semua dijalankan dari folder utama.

| Perintah | Fungsi |
|---|---|
| `npm install` | Install dependency server + client sekaligus |
| `npm run dev` | Nyalakan backend + frontend bersamaan |
| `npm run dev:server` | Backend saja |
| `npm run dev:client` | Frontend saja |
| `npm run seed:admin` | Buat akun admin pertama (sekali saja) |
| `npm run build` | Build frontend untuk produksi |
| `npm start` | Jalankan backend mode produksi |
| `npm run doctor` | Cek kelengkapan folder, versi Node, status `.env` — berguna kalau ada yang aneh |
| `npm run reset` | Hapus semua `node_modules` lalu install ulang bersih (tidak menyentuh kode/`.env`/database) |

---

## 6. Cara pakai

1. Buka `http://localhost:5173/admin/login`, login dengan akun admin.
2. Klik **+ Tambah Unit**, isi judul, spesifikasi, dan harga terjual, lalu simpan.
3. Setelah tersimpan, Anda diarahkan ke halaman edit unit tersebut — upload **Foto Produk** dan **Bukti Transaksi** di sana (seret file, tempel screenshot dengan Ctrl+V, atau klik untuk memilih file).
4. Klik **Selesai** untuk kembali ke daftar.
5. Buka `http://localhost:5173/` untuk melihat tampilan yang dilihat pengunjung/customer — termasuk tombol WhatsApp untuk kontak langsung.

---

## 7. Struktur folder

```
pc-portfolio/
├─ package.json          <- titik masuk semua perintah
├─ README.md             <- file ini
├─ scripts/
│  ├─ dev.mjs              menjalankan server + client bersamaan
│  ├─ check-structure.mjs  memastikan perintah dijalankan di folder yang benar
│  └─ reset.mjs            bersih-bersih dependency
├─ supabase/
│  ├─ schema.sql           SQL untuk membuat semua tabel
│  └─ storage-setup.md     panduan bikin storage bucket
├─ server/               backend Express
│  ├─ package.json
│  ├─ .env.example
│  └─ src/
│     ├─ config/supabase.js
│     ├─ middleware/auth.js     login, sesi, sliding session
│     ├─ routes/{auth,products}.js
│     └─ utils/validators.js
└─ client/               frontend React + Vite
   ├─ package.json
   ├─ .env.example
   ├─ index.html
   └─ src/
      ├─ config/site.js         nama brand, nomor WA, batas upload — satu tempat untuk semua
      ├─ api/client.js
      ├─ components/            PublicLayout, MediaUploader, WhatsAppButton, Lightbox
      ├─ context/AuthContext.jsx
      ├─ pages/                 halaman publik + admin
      └─ styles.css
```

### Kenapa tidak pakai npm workspaces

`npm run dev` di root **tidak** memakai fitur `workspaces` bawaan npm — hoisting workspaces kadang bikin paket yang punya binary asli (esbuild/rollup, dipakai Vite) gagal ketemu file binary-nya, khususnya di Windows. Sebagai gantinya dipakai `npm --prefix server ...` / `npm --prefix client ...`: setiap folder tetap punya `node_modules` sendiri (sama seperti `cd server && npm install` manual), cuma sekarang otomatis dari satu perintah root. `client/package.json` dan `server/package.json` tidak berubah struktur sama sekali.

`scripts/dev.mjs` juga tidak butuh dependency tambahan (tidak pakai `concurrently`) — cuma modul bawaan Node.js, jadi `npm run dev` tetap bisa jalan meski `npm install` di root belum sempat dijalankan; dependency yang belum ter-install akan diinstall otomatis pada percobaan pertama.

---

## 8. Ganti nama brand / nomor WhatsApp

Semua identitas website ada di **satu file**: `client/src/config/site.js`.

```js
export const SITE = {
  brandPrefix: 'Rakit',   // bagian putih
  brandSuffix: 'Pro',     // bagian berwarna aksen
  tagline: 'Custom PC Build & Sales',
};

export const WHATSAPP = {
  number: '6287871038664',        // format internasional, tanpa +/spasi/strip
  displayNumber: '0878-7103-8664',
};
```

Ganti nilai-nilai itu saja — header, topbar admin, footer, dan pesan WhatsApp otomatis ikut berubah. Satu pengecualian: judul `<title>` di `client/index.html` ditulis manual (file HTML statis tidak bisa membaca `site.js`), jadi kalau ganti nama, edit juga baris `<title>` di sana.

Nomor WhatsApp wajib format internasional tanpa tanda `+`, spasi, atau strip (`0878-7103-8664` → `6287871038664`, angka `0` di depan diganti `62`).

---

## 9. Sesi login admin (sliding session)

Supaya Anda tidak ter-logout di tengah-tengah mengisi form produk yang panjang atau saat sedang upload banyak foto, sesi login memakai skema **sliding session**:

- Setiap kali Anda melakukan aksi di panel admin, sesi diperiksa — kalau sisa umurnya sudah kurang dari separuh `JWT_EXPIRES_IN`, token diterbitkan ulang otomatis dengan masa berlaku penuh lagi.
- Efeknya: kerja seharian tidak akan terputus di tengah jalan, tapi kalau laptop ditinggal tanpa aktivitas, sesi tetap habis setelah durasi penuh (`JWT_EXPIRES_IN`, default 604800 detik = 7 hari).
- Jika sesi memang sudah habis, Anda otomatis diarahkan ke halaman login dengan pesan yang jelas.

Mau ubah durasinya? Edit `JWT_EXPIRES_IN` di `server/.env` (satuan **detik**, tanpa satuan lain — nilainya harus berupa angka murni seperti `86400` atau `604800`), lalu restart `npm run dev`.

---

## 10. Upload foto: drag & drop, tempel, atau pilih file

Di halaman edit unit, ada tiga cara mengupload foto (Foto Produk maupun Bukti Transaksi):

1. **Seret file** dari File Explorer/Finder ke kotak upload.
2. **Ctrl+V** (atau Cmd+V di Mac) — tempel screenshot langsung dari clipboard, tanpa perlu disimpan sebagai file dulu.
3. **Klik** kotaknya untuk memilih file lewat dialog biasa.

Arahkan kursor dulu ke kotak yang dituju sebelum Ctrl+V — halaman edit punya dua kotak upload (Foto Produk & Bukti Transaksi terpisah), jadi kotak yang sedang di-hover atau di-klik itulah yang menerima tempelan (ditandai badge "Siap menerima tempelan").

Validasi dilakukan di browser dulu (format harus JPG/PNG/WEBP, maksimal 5 MB per file) untuk feedback instan, **dan** divalidasi ulang di server (client tidak pernah dipercaya sepenuhnya).

---

## 11. Keamanan yang Diterapkan

- **Password admin di-hash** dengan bcrypt (12 rounds), tidak pernah disimpan dalam bentuk asli.
- **Sesi login** memakai JWT yang disimpan di cookie `httpOnly` (tidak bisa dicuri lewat JavaScript/XSS) dan `sameSite=lax` (mitigasi CSRF), serta `secure` (wajib HTTPS) saat `NODE_ENV=production`.
- **Rate limiting**: percobaan login dibatasi 10x/15 menit per IP untuk mencegah brute-force; seluruh API dibatasi 300 request/15 menit per IP.
- **Validasi input** di server memakai skema `zod` — semua data dari form divalidasi sebelum masuk database.
- **Upload file dibatasi**: hanya JPG/PNG/WEBP, maksimal 5MB per file, nama file di-randomize (mencegah path traversal / penimpaan file) — nama asli tidak pernah dipakai apa adanya.
- **Row Level Security (RLS)** aktif di semua tabel Supabase — akses langsung dari luar backend (misal jika `anon key` bocor) otomatis ditolak karena tidak ada policy publik yang dibuat.
- **`service_role key`** Supabase hanya pernah ada di server (backend), tidak pernah dikirim ke browser.
- **Helmet.js** mengatur HTTP security header standar (mencegah beberapa jenis serangan umum seperti clickjacking).
- **CORS** dibatasi hanya untuk origin frontend yang ditentukan di `CLIENT_ORIGIN`.
- Pesan error login sengaja generik ("Username atau password salah") agar tidak membocorkan informasi ke penyerang soal akun mana yang valid.

**Rekomendasi sebelum go-live:**
- Ganti `ADMIN_PASSWORD` di `.env` dengan password yang kuat dan unik.
- Jangan pernah commit file `.env` ke Git (sudah diatur di `.gitignore`).
- Kalau `.env` pernah tidak sengaja terkirim/ter-share ke pihak lain (misal ikut ter-zip dan dikirim), **rotate** `SUPABASE_SERVICE_ROLE_KEY` lewat Supabase Dashboard → Project Settings → API, lalu update `server/.env` lokal Anda. Kunci `service_role` setara akses penuh ke seluruh database dan melewati semua RLS, jadi sebaiknya tidak pernah dianggap "aman" lagi begitu berpindah tangan.
- Setelah deploy ke domain publik, pastikan diakses lewat **HTTPS** (Vercel otomatis menyediakan ini).

---

## 12. Rencana Deploy ke Vercel + Supabase

Supabase sudah dipakai sejak development lokal, jadi saat deploy nanti **tidak perlu migrasi data apa pun** — tinggal:

1. Push project ini ke GitHub.
2. Di Vercel, buat 2 project terpisah (atau gabung jadi monorepo dengan konfigurasi build terpisah):
   - Satu untuk `client/` (frontend) — build command `npm run build`, output folder `dist`.
   - Satu untuk `server/` (backend) — Express perlu sedikit penyesuaian agar kompatibel dengan Vercel Serverless Functions. Beri tahu saya saat Anda siap deploy, dan saya akan bantu sesuaikan konfigurasinya.
3. Isi environment variables yang sama seperti di `.env` lokal, di dashboard Vercel (Settings → Environment Variables) untuk kedua project.
4. Update `CLIENT_ORIGIN` di backend dan `VITE_API_URL` di frontend agar mengarah ke domain production masing-masing.

---

## 13. Kalau ada error

### `Cannot find module ...` atau `vite: command not found`

Dependency belum lengkap atau sisa percobaan install yang lama masih nyangkut:

```bash
npm run reset
```

Perintah itu menghapus `node_modules` (root, server, client) dan `package-lock.json` di root, lalu install ulang dari nol. Kode, `.env`, dan database tidak disentuh.

### `EADDRINUSE: port 4000 sudah dipakai`

Masih ada proses lama yang hidup. Di Git Bash / PowerShell:

```powershell
netstat -ano | findstr :4000     # lihat PID di kolom paling kanan
taskkill /PID <nomor_pid> /F
```

Dengan `npm run dev` di project ini, Ctrl+C seharusnya sudah ikut mematikan proses turunannya, jadi ini jarang terjadi kecuali proses dimatikan paksa (menutup terminal langsung, dsb).

### Login gagal terus / "Username atau password salah"

- Pastikan `npm run seed:admin` sudah pernah berhasil dijalankan (muncul pesan `[SUCCESS]`) — akun admin baru benar-benar ada di database setelah itu.
- Cek `SUPABASE_URL` di `server/.env`: harus persis `https://xxxxx.supabase.co`, **tanpa** `/rest/v1/` atau path lain di belakangnya.
- Cek `SUPABASE_SERVICE_ROLE_KEY` diambil dari baris `service_role` (bukan `anon public`) di Project Settings → API.

### "Sesi tidak valid" padahal baru login / sesi cepat habis

Pastikan `JWT_EXPIRES_IN` di `server/.env` diisi **angka murni tanpa satuan** (misal `604800`), bukan string dengan satuan lain. Setelah mengubah `.env`, restart `npm run dev` supaya nilainya terbaca ulang.

### Frontend jalan tapi data kosong / error jaringan di console browser

- Pastikan `[SERVER]` juga muncul (dan tidak error) di output `npm run dev`.
- Cek `VITE_API_URL` di `client/.env` — harus `http://localhost:4000/api`.
- Cek `CLIENT_ORIGIN` di `server/.env` — harus `http://localhost:5173`, kalau tidak cocok, browser akan memblokir karena CORS.

### Foto tidak muncul / gagal upload

- Pastikan bucket `pc-portfolio-media` sudah dibuat dan di-set **Public** di Supabase Storage (lihat [`supabase/storage-setup.md`](./supabase/storage-setup.md)).
- Format yang diterima JPG/PNG/WEBP, maksimal 5 MB, maksimal 15 file sekali upload.

### Masih buntu

```bash
npm run doctor
```

Outputnya menampilkan folder yang dipakai, versi Node, serta status `node_modules` dan `.env` di kedua sisi — biasanya dari situ ketahuan yang kurang.
