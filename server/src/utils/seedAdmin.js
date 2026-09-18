// Script one-time untuk membuat akun admin pertama.
// Jalankan dengan: npm run seed:admin
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { supabase } from '../config/supabase.js';

dotenv.config();

async function main() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    console.error('[ERROR] ADMIN_USERNAME dan ADMIN_PASSWORD wajib diisi di file .env sebelum menjalankan script ini.');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('[ERROR] ADMIN_PASSWORD minimal 8 karakter. Gunakan password yang kuat.');
    process.exit(1);
  }

  const { data: existing } = await supabase
    .from('admins')
    .select('id')
    .eq('username', username)
    .maybeSingle();

  if (existing) {
    console.log(`[INFO] Admin dengan username "${username}" sudah ada. Tidak ada perubahan dibuat.`);
    console.log('[INFO] Jika ingin mengganti password, hapus dulu baris admin ini di tabel "admins" lewat Supabase Dashboard, lalu jalankan script ini lagi.');
    process.exit(0);
  }

  const password_hash = await bcrypt.hash(password, 12);

  const { error } = await supabase.from('admins').insert({ username, password_hash });

  if (error) {
    console.error('[ERROR] Gagal membuat admin:', error.message);
    process.exit(1);
  }

  console.log(`[SUCCESS] Akun admin "${username}" berhasil dibuat. Silakan login di halaman /admin/login.`);
  console.log('[PENTING] Demi keamanan, sebaiknya hapus atau ganti ADMIN_PASSWORD di file .env setelah ini.');
  process.exit(0);
}

main();
