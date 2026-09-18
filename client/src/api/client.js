import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // wajib agar cookie httpOnly (sesi login) ikut terkirim
});

// Jika sesi benar-benar sudah habis (401) saat sedang di halaman admin,
// arahkan otomatis ke halaman login alih-alih membiarkan pengguna
// menekan tombol simpan berkali-kali tanpa tahu kenapa gagal.
// Halaman login itu sendiri tidak pernah memanggil endpoint terproteksi,
// jadi tidak akan menyebabkan redirect loop.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isUnauthorized = err?.response?.status === 401;
    const onAdminPage = window.location.pathname.startsWith('/admin');
    const onLoginPage = window.location.pathname === '/admin/login';

    if (isUnauthorized && onAdminPage && !onLoginPage) {
      window.location.href = '/admin/login?expired=1';
    }
    return Promise.reject(err);
  }
);

export function extractErrorMessage(err, fallback = 'Terjadi kesalahan. Coba lagi.') {
  return err?.response?.data?.error || fallback;
}
