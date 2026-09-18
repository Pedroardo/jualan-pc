# Setup Supabase Storage Bucket

Backend butuh satu bucket untuk menyimpan foto produk & bukti transaksi.

1. Buka **Supabase Dashboard** → project Anda → menu **Storage**.
2. Klik **New bucket**.
3. Nama bucket: `pc-portfolio-media`
4. Set **Public bucket** = **ON** (foto perlu bisa diakses langsung lewat URL oleh pengunjung website).
5. Klik **Create bucket**.

Tidak perlu membuat policy tambahan — semua upload/hapus file dilakukan lewat backend
menggunakan **service role key**, yang otomatis punya akses penuh dan melewati policy bucket.
Bucket publik hanya berarti file yang SUDAH diupload bisa dibaca lewat URL publik (read-only bagi pengunjung),
bukan berarti sembarang orang bisa upload/hapus.
