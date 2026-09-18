// ============================================================
// Satu tempat untuk semua identitas website.
// Mau ganti nama brand atau nomor WhatsApp? Cukup ubah di sini,
// semua halaman (header, admin, judul tab, tombol WA) ikut berubah.
// ============================================================

export const SITE = {
  // Nama simpel, satu kata — dulu "RakitPro"
  name: 'Rakit',

  tagline: 'Custom PC Build & Sales',
  description:
    'Portofolio unit PC rakitan — spesifikasi lengkap, foto asli, dan bukti transaksi setiap unit yang terjual.',
};

// ============================================================
// WhatsApp
// ============================================================
// Format wajib internasional tanpa "+", tanpa spasi, tanpa strip.
// Nomor lokal 0878-7103-8664  ->  0 diganti 62  ->  6287871038664
export const WHATSAPP = {
  number: '6287871038664',
  displayNumber: '0878-7103-8664',

  // Pesan default saat tombol WA ditekan dari halaman umum
  defaultMessage: `Halo ${SITE.name}, saya lihat portofolio PC rakitannya. Saya mau tanya-tanya, boleh?`,
};

/**
 * Membuat link wa.me yang siap dipakai di atribut href.
 * @param {string} [message] teks yang otomatis terisi di kolom chat WhatsApp
 */
export function waLink(message) {
  const text = encodeURIComponent(message || WHATSAPP.defaultMessage);
  return `https://wa.me/${WHATSAPP.number}?text=${text}`;
}

// ============================================================
// Batas upload — harus SAMA dengan server/src/utils/validators.js
// ============================================================
export const UPLOAD = {
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  maxFileSizeBytes: 5 * 1024 * 1024, // 5 MB
  maxFilesPerUpload: 15,
};
