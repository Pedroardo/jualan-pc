-- ============================================================
-- Schema untuk PC Seller Portfolio
-- Jalankan file ini di Supabase Dashboard > SQL Editor
-- ============================================================

-- Ekstensi untuk generate UUID
create extension if not exists "pgcrypto";

-- ============================================================
-- Tabel: admins
-- Menyimpan akun admin (Anda). Password disimpan dalam bentuk
-- hash bcrypt, TIDAK PERNAH dalam bentuk plain text.
-- ============================================================
create table if not exists admins (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Tabel: products
-- Setiap baris = satu unit PC yang pernah/sedang dijual.
-- ============================================================
create table if not exists products (
  id uuid primary key default gen_random_uuid(),

  title text not null,                    -- Nama/judul unit PC, misal "PC Gaming Ryzen 5 5600 + RTX 3060"
  description text,                       -- Deskripsi bebas

  -- Spesifikasi (disimpan terstruktur agar mudah ditampilkan rapi)
  spec_cpu text,
  spec_gpu text,
  spec_motherboard text,
  spec_ram text,
  spec_storage text,
  spec_psu text,
  spec_case text,
  spec_other text,                        -- Spek tambahan bebas (monitor, cooler, dll)

  price_sold bigint not null default 0,   -- Harga terjual (dalam Rupiah, tanpa desimal)
  status text not null default 'sold'     -- 'sold' | 'available' (untuk fleksibilitas ke depan)
    check (status in ('sold', 'available')),

  sold_at date,                           -- Tanggal laku terjual
  buyer_note text,                        -- Catatan opsional, misal inisial pembeli / kota (privasi tetap dijaga)

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Tabel: product_media
-- Menyimpan referensi foto (produk & bukti transaksi).
-- File fisik disimpan di Supabase Storage; di sini hanya path/url-nya.
-- ============================================================
create table if not exists product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,

  media_type text not null check (media_type in ('product_photo', 'proof_photo')),
  storage_path text not null,             -- path di dalam bucket Supabase Storage
  sort_order int not null default 0,      -- urutan tampil foto produk

  created_at timestamptz not null default now()
);

create index if not exists idx_product_media_product_id on product_media(product_id);
create index if not exists idx_products_status on products(status);
create index if not exists idx_products_sold_at on products(sold_at desc);

-- ============================================================
-- Trigger: auto-update updated_at
-- ============================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_products_updated_at on products;
create trigger trg_products_updated_at
  before update on products
  for each row
  execute function set_updated_at();

-- ============================================================
-- Row Level Security (RLS)
-- Backend kita mengakses tabel ini via SERVICE ROLE KEY, yang
-- otomatis melewati RLS. RLS di sini adalah lapisan pengaman
-- tambahan agar jika suatu saat ada kunci publik (anon key)
-- yang bocor/dipakai, tetap tidak bisa mengubah data apa pun
-- secara langsung ke database.
-- ============================================================
alter table admins enable row level security;
alter table products enable row level security;
alter table product_media enable row level security;

-- Tidak ada policy dibuat untuk role 'anon' / 'authenticated' sama sekali,
-- artinya secara default SEMUA akses via anon key akan ditolak.
-- Semua operasi baca/tulis WAJIB lewat backend Express (service role).
