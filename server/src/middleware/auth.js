import jwt from 'jsonwebtoken';

const COOKIE_NAME = 'pc_portfolio_session';

// ------------------------------------------------------------
// PENTING — sumber bug "sesi cepat kedaluwarsa":
//
// Sebelumnya: jwt.sign(..., { expiresIn: process.env.JWT_EXPIRES_IN || '86400' })
// process.env SELALU bertipe string. Library jsonwebtoken punya aturan:
//   - expiresIn bertipe NUMBER  -> dianggap DETIK   (86400 = 1 hari)
//   - expiresIn bertipe STRING  -> diparse pakai ms(), dan "86400" tanpa satuan
//                                  diartikan 86400 MILIDETIK = 86,4 detik!
//
// Jadi token benar-benar mati ~1,5 menit, sementara cookie-nya masih hidup 1 hari
// (karena maxAge sudah pakai Number()). Itu sebabnya muncul "sesi tidak valid"
// padahal belum 15 menit.
//
// Perbaikan: paksa jadi angka lewat Number(), dengan fallback aman.
// ------------------------------------------------------------
function getSessionSeconds() {
  const raw = Number(process.env.JWT_EXPIRES_IN);
  // default 1 hari; minimal 60 detik supaya salah ketik tidak bikin sesi 0
  if (!Number.isFinite(raw) || raw < 60) return 86400;
  return Math.floor(raw);
}

export const SESSION_SECONDS = getSessionSeconds();

export function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: getSessionSeconds(), // NUMBER -> dibaca sebagai detik
  });
}

export function setAuthCookie(res, token) {
  const seconds = getSessionSeconds();
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true, // tidak bisa diakses lewat JavaScript di browser -> mitigasi XSS
    secure: process.env.NODE_ENV === 'production', // wajib HTTPS saat production
    sameSite: 'lax', // mitigasi CSRF dasar
    maxAge: seconds * 1000, // cookie dan token sekarang selalu sinkron
    path: '/',
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

// Middleware: wajib login sebagai admin untuk mengakses route ini
export function requireAdmin(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];

  if (!token) {
    return res.status(401).json({ error: 'Belum login. Silakan login terlebih dahulu.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;

    // ------------------------------------------------------------
    // Sliding session: selama Anda masih aktif memakai admin panel,
    // sesi diperpanjang otomatis. Token hanya diterbitkan ulang kalau
    // sisa umurnya sudah di bawah separuh — supaya tidak boros
    // tanda tangan JWT di setiap request.
    //
    // Efeknya: kerja seharian tidak akan terputus di tengah jalan,
    // tapi kalau laptop ditinggal, sesi tetap mati setelah 1 hari.
    // ------------------------------------------------------------
    const seconds = getSessionSeconds();
    const now = Math.floor(Date.now() / 1000);
    const sisaUmur = (decoded.exp || 0) - now;

    if (sisaUmur > 0 && sisaUmur < seconds / 2) {
      const fresh = signToken({ id: decoded.id, username: decoded.username });
      setAuthCookie(res, fresh);
    }

    next();
  } catch (err) {
    clearAuthCookie(res);
    return res.status(401).json({ error: 'Sesi login tidak valid atau sudah kedaluwarsa.' });
  }
}

export { COOKIE_NAME };
