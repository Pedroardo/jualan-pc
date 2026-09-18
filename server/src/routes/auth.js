import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { supabase } from '../config/supabase.js';
import { loginSchema } from '../utils/validators.js';
import {
  signToken,
  setAuthCookie,
  clearAuthCookie,
  requireAdmin,
  SESSION_SECONDS,
} from '../middleware/auth.js';

const router = Router();

// Batasi percobaan login: maksimal 10 kali per 15 menit per IP,
// untuk mencegah brute-force password admin.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak percobaan login. Coba lagi dalam beberapa menit.' },
});

router.post('/login', loginLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }
  const { username, password } = parsed.data;

  const { data: admin, error } = await supabase
    .from('admins')
    .select('id, username, password_hash')
    .eq('username', username)
    .maybeSingle();

  // Pesan error sengaja dibuat generik (tidak membedakan "user tidak ada"
  // vs "password salah") agar tidak membocorkan info ke penyerang.
  const genericError = 'Username atau password salah.';

  if (error || !admin) {
    return res.status(401).json({ error: genericError });
  }

  const match = await bcrypt.compare(password, admin.password_hash);
  if (!match) {
    return res.status(401).json({ error: genericError });
  }

  const token = signToken({ id: admin.id, username: admin.username });
  setAuthCookie(res, token);

  res.json({
    ok: true,
    admin: { username: admin.username },
    // dikirim ke frontend supaya bisa ditampilkan ("sesi aktif 1 hari")
    sessionSeconds: SESSION_SECONDS,
  });
});

router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

// requireAdmin sekaligus memperpanjang sesi (sliding session).
// Frontend memanggil endpoint ini saat aplikasi dibuka, jadi selama
// admin panel dipakai, sesi tidak akan putus di tengah pekerjaan.
router.get('/me', requireAdmin, (req, res) => {
  res.json({
    admin: { username: req.admin.username },
    sessionSeconds: SESSION_SECONDS,
    expiresAt: req.admin.exp ? req.admin.exp * 1000 : null,
  });
});

export default router;
