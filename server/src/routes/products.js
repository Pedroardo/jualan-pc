import { Router } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import { supabase, STORAGE_BUCKET } from '../config/supabase.js';
import { requireAdmin } from '../middleware/auth.js';
import {
  productSchema,
  productUpdateSchema,
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_FILES_PER_UPLOAD,
} from '../utils/validators.js';

const router = Router();

// Multer menyimpan file di memori dulu (bukan disk), lalu kita upload
// ke Supabase Storage. Ini penting agar kompatibel dengan Vercel (serverless,
// tidak punya disk permanen).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: MAX_FILES_PER_UPLOAD },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      return cb(new Error('Tipe file tidak diizinkan. Hanya JPG, PNG, atau WEBP.'));
    }
    cb(null, true);
  },
});

// Ekstensi cadangan berdasarkan mimetype. Gambar hasil paste (Ctrl+V) dari
// clipboard sering datang tanpa nama file sama sekali, sehingga
// path.extname() mengembalikan string kosong dan file tersimpan tanpa
// ekstensi — akibatnya browser bisa salah menebak tipe saat menampilkannya.
const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

function safeFileName(originalName, mimetype) {
  // Nama asli TIDAK pernah dipakai apa adanya — selalu diganti string acak.
  // Ini mencegah path traversal ("../../rahasia.png") sekaligus penimpaan
  // file lain yang kebetulan bernama sama.
  let ext = path.extname(originalName || '').toLowerCase();
  if (!ext || ext.length > 6) {
    ext = EXT_BY_MIME[mimetype] || '.jpg';
  }
  const random = crypto.randomBytes(16).toString('hex');
  return `${random}${ext}`;
}

// ------------------------------------------------------------
// Validasi "magic bytes" — beberapa byte pertama isi file.
// Field `mimetype` pada multipart/form-data dikirim oleh BROWSER dan bisa
// dipalsukan dengan mudah (misal file .html diberi header Content-Type
// image/jpeg). fileFilter multer hanya memeriksa header itu, belum
// memeriksa ISI file sebenarnya. Ini lapisan tambahan: pastikan byte
// pertama file memang benar-benar menandakan JPEG/PNG/WEBP asli sebelum
// disimpan & dipublikasikan lewat Supabase Storage.
// ------------------------------------------------------------
function hasValidImageSignature(buffer, mimetype) {
  if (!buffer || buffer.length < 12) return false;

  if (mimetype === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimetype === 'image/png') {
    const pngSig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return pngSig.every((byte, i) => buffer[i] === byte);
  }
  if (mimetype === 'image/webp') {
    const isRiff = buffer.slice(0, 4).toString('ascii') === 'RIFF';
    const isWebp = buffer.slice(8, 12).toString('ascii') === 'WEBP';
    return isRiff && isWebp;
  }
  return false;
}

async function attachMediaUrls(mediaRows) {
  return mediaRows.map((m) => {
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(m.storage_path);
    return { ...m, url: data.publicUrl };
  });
}

// ============================================================
// PUBLIC: daftar produk (untuk halaman portofolio)
// ============================================================
router.get('/', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize) || 12));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: products, error, count } = await supabase
    .from('products')
    .select('*', { count: 'exact' })
    .order('sold_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error(error);
    return res.status(500).json({ error: 'Gagal mengambil data produk.' });
  }

  const ids = products.map((p) => p.id);
  let mediaByProduct = {};

  if (ids.length > 0) {
    const { data: media, error: mediaError } = await supabase
      .from('product_media')
      .select('*')
      .in('product_id', ids)
      .eq('media_type', 'product_photo')
      .order('sort_order', { ascending: true });

    if (!mediaError) {
      const withUrls = await attachMediaUrls(media);
      mediaByProduct = withUrls.reduce((acc, m) => {
        (acc[m.product_id] ||= []).push(m);
        return acc;
      }, {});
    }
  }

  const result = products.map((p) => ({ ...p, photos: mediaByProduct[p.id] || [] }));

  // Data publik yang jarang berubah tiap detik — cache singkat di CDN/browser
  // mengurangi beban server untuk trafik yang berulang membuka halaman ini,
  // tanpa membuat perubahan admin terasa "nyangkut" lebih dari beberapa detik.
  res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');

  res.json({
    products: result,
    pagination: { page, pageSize, total: count || 0, totalPages: Math.ceil((count || 0) / pageSize) },
  });
});

// ============================================================
// PUBLIC: detail satu produk (termasuk foto produk & bukti transaksi)
// ============================================================
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !product) {
    return res.status(404).json({ error: 'Produk tidak ditemukan.' });
  }

  const { data: media, error: mediaError } = await supabase
    .from('product_media')
    .select('*')
    .eq('product_id', id)
    .order('sort_order', { ascending: true });

  if (mediaError) {
    return res.status(500).json({ error: 'Gagal mengambil media produk.' });
  }

  const withUrls = await attachMediaUrls(media);

  res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');

  res.json({
    product: {
      ...product,
      photos: withUrls.filter((m) => m.media_type === 'product_photo'),
      proofs: withUrls.filter((m) => m.media_type === 'proof_photo'),
    },
  });
});

// ============================================================
// ADMIN: buat produk baru
// ============================================================
router.post('/', requireAdmin, async (req, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }

  const payload = { ...parsed.data };
  if (payload.sold_at === '') delete payload.sold_at;

  const { data, error } = await supabase.from('products').insert(payload).select().single();

  if (error) {
    console.error(error);
    return res.status(500).json({ error: 'Gagal menyimpan produk.' });
  }

  res.status(201).json({ product: data });
});

// ============================================================
// ADMIN: update produk
// ============================================================
router.put('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const parsed = productUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }

  const payload = { ...parsed.data };
  if (payload.sold_at === '') payload.sold_at = null;

  const { data, error } = await supabase
    .from('products')
    .update(payload)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) {
    console.error(error);
    return res.status(500).json({ error: 'Gagal memperbarui produk.' });
  }
  if (!data) {
    return res.status(404).json({ error: 'Produk tidak ditemukan.' });
  }

  res.json({ product: data });
});

// ============================================================
// ADMIN: hapus produk (beserta media terkait di storage)
// ============================================================
router.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  const { data: media } = await supabase
    .from('product_media')
    .select('storage_path')
    .eq('product_id', id);

  if (media && media.length > 0) {
    const paths = media.map((m) => m.storage_path);
    await supabase.storage.from(STORAGE_BUCKET).remove(paths);
  }

  const { error } = await supabase.from('products').delete().eq('id', id);

  if (error) {
    console.error(error);
    return res.status(500).json({ error: 'Gagal menghapus produk.' });
  }

  res.json({ ok: true });
});

// ============================================================
// ADMIN: upload foto (produk atau bukti transaksi) untuk suatu produk
// field form-data: "files" (bisa banyak), "media_type" = product_photo | proof_photo
// ============================================================
router.post('/:id/media', requireAdmin, upload.array('files', MAX_FILES_PER_UPLOAD), async (req, res) => {
  const { id } = req.params;
  const mediaType = req.body.media_type;

  if (!['product_photo', 'proof_photo'].includes(mediaType)) {
    return res.status(400).json({ error: 'media_type harus "product_photo" atau "proof_photo".' });
  }

  const { data: product } = await supabase.from('products').select('id').eq('id', id).maybeSingle();
  if (!product) {
    return res.status(404).json({ error: 'Produk tidak ditemukan.' });
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'Tidak ada file yang diupload.' });
  }

  // Hitung urutan terakhir agar foto baru masuk di belakang, bukan menyalip
  // foto sampul yang sudah dipilih sebelumnya.
  const { data: terakhir } = await supabase
    .from('product_media')
    .select('sort_order')
    .eq('product_id', id)
    .eq('media_type', mediaType)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  let urutan = (terakhir?.sort_order ?? -1) + 1;

  const inserted = [];

  for (const file of req.files) {
    if (!hasValidImageSignature(file.buffer, file.mimetype)) {
      console.warn(`Upload ditolak: isi file tidak cocok dengan tipe "${file.mimetype}" yang diklaim.`);
      continue; // lewati file yang isinya tidak cocok dengan tipe yang diklaim
    }

    const fileName = safeFileName(file.originalname, file.mimetype);
    const storagePath = `${id}/${mediaType}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file.buffer, { contentType: file.mimetype, upsert: false });

    if (uploadError) {
      console.error(uploadError);
      continue; // lewati file yang gagal, lanjutkan sisanya
    }

    const { data: mediaRow, error: dbError } = await supabase
      .from('product_media')
      .insert({
        product_id: id,
        media_type: mediaType,
        storage_path: storagePath,
        sort_order: urutan++,
      })
      .select()
      .single();

    if (!dbError) inserted.push(mediaRow);
  }

  if (inserted.length === 0) {
    return res.status(500).json({ error: 'Semua file gagal diupload. Coba lagi.' });
  }

  const withUrls = await attachMediaUrls(inserted);
  res.status(201).json({ media: withUrls });
});

// ============================================================
// ADMIN: hapus satu foto
// ============================================================
router.delete('/:id/media/:mediaId', requireAdmin, async (req, res) => {
  const { id, mediaId } = req.params;

  // Query di-scope ke product_id dari URL juga (bukan cuma media id) —
  // mencegah menghapus media lewat kombinasi :id/:mediaId yang sebenarnya
  // tidak berpasangan (IDOR).
  const { data: mediaRow } = await supabase
    .from('product_media')
    .select('storage_path')
    .eq('id', mediaId)
    .eq('product_id', id)
    .maybeSingle();

  if (!mediaRow) {
    return res.status(404).json({ error: 'Media tidak ditemukan.' });
  }

  await supabase.storage.from(STORAGE_BUCKET).remove([mediaRow.storage_path]);
  const { error } = await supabase.from('product_media').delete().eq('id', mediaId).eq('product_id', id);

  if (error) {
    return res.status(500).json({ error: 'Gagal menghapus media.' });
  }

  res.json({ ok: true });
});

// Multer error handler khusus untuk route ini (ukuran file, dll)
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err) {
    return res.status(400).json({ error: err.message || 'Gagal memproses upload file.' });
  }
  next();
});

export default router;
