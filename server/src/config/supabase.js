import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    '[FATAL] SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diisi di file .env.\n' +
    'Salin server/.env.example menjadi server/.env lalu isi nilainya.'
  );
  process.exit(1);
}

// Service role key HANYA dipakai di server (backend), TIDAK PERNAH dikirim ke frontend.
// Ini memberi akses penuh ke database, jadi harus dijaga kerahasiaannya.
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export const STORAGE_BUCKET = 'pc-portfolio-media';
