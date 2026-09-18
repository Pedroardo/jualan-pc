import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';

dotenv.config();

// ------------------------------------------------------------
// Validasi env wajib saat startup — konsisten dengan pengecekan
// SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY di config/supabase.js.
// Tanpa ini, server tetap jalan tapi login akan gagal dengan error
// generik yang membingungkan (jwt.sign tanpa secret). Lebih baik
// gagal cepat & jelas di awal daripada bingung saat production.
// ------------------------------------------------------------
if (!process.env.JWT_SECRET) {
  console.error(
    '[FATAL] JWT_SECRET belum diisi di file .env.\n' +
    'Generate nilai acak & panjang, contoh: openssl rand -hex 64'
  );
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// Hanya percaya header X-Forwarded-For saat server memang berjalan di
// belakang reverse proxy tepercaya (Vercel, Nginx, load balancer, dll).
// Set TRUST_PROXY=true di .env HANYA jika itu kondisinya — kalau
// dipasang sembarangan padahal server diakses langsung, klien bisa
// memalsukan IP asalnya sendiri lewat header ini dan melewati rate limit.
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// ------------------------------------------------------------
// Security & performance middleware
// ------------------------------------------------------------
app.use(helmet()); // set berbagai HTTP security header standar
app.use(compression()); // gzip response JSON -> payload lebih kecil, lebih cepat sampai ke klien
app.use(
  cors({
    origin: CLIENT_ORIGIN, // hanya frontend ini yang boleh akses API (dengan cookie)
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Rate limit umum untuk seluruh API, mencegah penyalahgunaan/DoS ringan
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', globalLimiter);

// ------------------------------------------------------------
// Routes
// ------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'pc-portfolio-server' });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint tidak ditemukan.' });
});

// Generic error handler (jangan bocorkan detail error internal ke client)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: 'Terjadi kesalahan pada server.' });
});

app.listen(PORT, () => {
  console.log(`✅ Server berjalan di http://localhost:${PORT}`);
});
