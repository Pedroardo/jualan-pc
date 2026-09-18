import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api, extractErrorMessage } from '../api/client.js';
import { UPLOAD } from '../config/site.js';

// ============================================================
// Helper kecil di luar komponen supaya tidak dibuat ulang tiap render
// ============================================================

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const EXT_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Gambar hasil paste (Ctrl+V) sering datang tanpa nama file, atau bernama
 * "image.png" semua sehingga bentrok. Di sini kita beri nama unik + ekstensi
 * yang benar, supaya server bisa menyimpan path dengan ekstensi yang valid.
 */
function normalizeFile(file, index = 0) {
  const ext = EXT_BY_MIME[file.type] || 'jpg';
  const punyaNama = file.name && file.name.includes('.');
  if (punyaNama) return file;

  const namaBaru = `tempel-${Date.now()}-${index}.${ext}`;
  return new File([file], namaBaru, { type: file.type, lastModified: Date.now() });
}

/**
 * Validasi di sisi browser SEBELUM dikirim. Server tetap memvalidasi ulang
 * (jangan pernah percaya client), tapi ini bikin feedback ke Anda instan
 * dan menghemat kuota upload.
 */
function pisahkanFileValid(files) {
  const valid = [];
  const ditolak = [];

  files.forEach((f) => {
    if (!UPLOAD.allowedTypes.includes(f.type)) {
      ditolak.push(`${f.name || 'file'} — format tidak didukung (hanya JPG, PNG, WEBP)`);
    } else if (f.size > UPLOAD.maxFileSizeBytes) {
      ditolak.push(`${f.name || 'file'} — ${formatBytes(f.size)}, melebihi batas 5 MB`);
    } else {
      valid.push(f);
    }
  });

  return { valid, ditolak };
}

// ============================================================
// Komponen
// ============================================================

export default function MediaUploader({ productId, mediaType, label, hint, existingMedia, onChange }) {
  const inputRef = useRef(null);
  const zoneRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // dragDepth menghitung enter/leave. Tanpa ini, border highlight akan
  // berkedip-kedip saat kursor melewati elemen anak di dalam drop zone.
  const [dragDepth, setDragDepth] = useState(0);
  const isDragging = dragDepth > 0;

  // Menandai apakah zona ini sedang "dibidik" user (di-hover atau di-klik).
  // Dipakai agar Ctrl+V masuk ke zona yang benar — halaman ini punya DUA
  // uploader (Foto Produk & Bukti Transaksi), jadi harus jelas tujuannya.
  const [aktif, setAktif] = useState(false);

  // ------------------------------------------------------------
  // Inti: kirim file ke server
  // ------------------------------------------------------------
  const uploadFiles = useCallback(
    async (rawFiles) => {
      if (!rawFiles || rawFiles.length === 0) return;

      setError('');
      setInfo('');

      const dinormalkan = rawFiles.map((f, i) => normalizeFile(f, i));
      const { valid, ditolak } = pisahkanFileValid(dinormalkan);

      if (ditolak.length > 0) {
        setError(`${ditolak.length} file dilewati:\n• ${ditolak.join('\n• ')}`);
      }
      if (valid.length === 0) return;

      let batch = valid;
      if (valid.length > UPLOAD.maxFilesPerUpload) {
        batch = valid.slice(0, UPLOAD.maxFilesPerUpload);
        setInfo(`Maksimal ${UPLOAD.maxFilesPerUpload} file sekali kirim. ${valid.length - batch.length} sisanya silakan upload lagi setelah ini.`);
      }

      const formData = new FormData();
      formData.append('media_type', mediaType);
      batch.forEach((f) => formData.append('files', f));

      setUploading(true);
      setProgress(0);

      try {
        const res = await api.post(`/products/${productId}/media`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) => {
            if (!e.total) return;
            setProgress(Math.round((e.loaded * 100) / e.total));
          },
        });
        onChange([...(existingMedia || []), ...res.data.media]);
        setInfo(`${res.data.media.length} foto berhasil diupload.`);
      } catch (err) {
        setError(extractErrorMessage(err, 'Gagal mengupload foto.'));
      } finally {
        setUploading(false);
        setProgress(0);
        if (inputRef.current) inputRef.current.value = '';
      }
    },
    [productId, mediaType, existingMedia, onChange]
  );

  // ------------------------------------------------------------
  // Cara 1 — tombol pilih file (cara lama, tetap ada)
  // ------------------------------------------------------------
  function handleInputChange(e) {
    uploadFiles(Array.from(e.target.files || []));
  }

  // ------------------------------------------------------------
  // Cara 2 — drag & drop
  //
  // dragOver WAJIB di-preventDefault. Kalau tidak, browser menganggap
  // area ini bukan target drop yang sah dan malah membuka gambarnya
  // di tab baru saat dilepas.
  // ------------------------------------------------------------
  function handleDragEnter(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragDepth((d) => d + 1);
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy'; // kursor jadi ikon "+" alih-alih tanda larangan
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragDepth((d) => Math.max(0, d - 1));
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragDepth(0);
    if (uploading) return;

    const dt = e.dataTransfer;
    // Ambil dari items dulu (lebih akurat: bisa membedakan file vs teks/URL),
    // fallback ke dt.files untuk browser lama.
    let files = [];
    if (dt.items && dt.items.length > 0) {
      files = Array.from(dt.items)
        .filter((it) => it.kind === 'file')
        .map((it) => it.getAsFile())
        .filter(Boolean);
    }
    if (files.length === 0) files = Array.from(dt.files || []);

    uploadFiles(files);
  }

  // ------------------------------------------------------------
  // Cara 3 — tempel dari clipboard (Ctrl+V / Cmd+V)
  //
  // Event 'paste' hanya dikirim ke elemen yang sedang fokus atau ke window.
  // Kita pasang di window supaya screenshot bisa langsung ditempel tanpa
  // harus klik dulu — tapi hanya diproses oleh zona yang sedang aktif
  // (di-hover atau di-klik), supaya tidak nyasar ke uploader sebelah.
  // ------------------------------------------------------------
  useEffect(() => {
    function handlePaste(e) {
      if (!aktif || uploading) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      const files = Array.from(items)
        .filter((it) => it.kind === 'file' && it.type.startsWith('image/'))
        .map((it) => it.getAsFile())
        .filter(Boolean);

      if (files.length === 0) return;

      e.preventDefault(); // cegah browser menempel gambar ke tempat lain
      uploadFiles(files);
    }

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [aktif, uploading, uploadFiles]);

  // ------------------------------------------------------------
  // Hapus foto yang sudah terupload
  // ------------------------------------------------------------
  async function handleRemove(mediaId) {
    if (!window.confirm('Hapus foto ini?')) return;
    try {
      await api.delete(`/products/${productId}/media/${mediaId}`);
      onChange((existingMedia || []).filter((m) => m.id !== mediaId));
    } catch (err) {
      setError(extractErrorMessage(err, 'Gagal menghapus foto.'));
    }
  }

  const zoneClass = [
    'upload-zone',
    isDragging ? 'is-dragging' : '',
    aktif && !isDragging ? 'is-active' : '',
    uploading ? 'is-uploading' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div>
      <h3 className="section-title">{label}</h3>
      {hint && <p className="upload-hint">{hint}</p>}

      {error && <div className="form-error" style={{ whiteSpace: 'pre-line' }}>{error}</div>}
      {info && !error && <div className="form-success">{info}</div>}

      {existingMedia?.length > 0 && (
        <div className="upload-preview-grid">
          {existingMedia.map((m) => (
            <div className="upload-preview-item" key={m.id}>
              <img src={m.url} alt="" />
              <button type="button" onClick={() => handleRemove(m.id)} aria-label="Hapus foto">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        ref={zoneRef}
        className={zoneClass}
        tabIndex={0}
        role="button"
        aria-label={`Area upload ${label}. Seret file ke sini, tempel dengan Ctrl+V, atau tekan Enter untuk memilih file.`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onMouseEnter={() => setAktif(true)}
        onMouseLeave={() => setAktif(false)}
        onFocus={() => setAktif(true)}
        onBlur={() => setAktif(false)}
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !uploading) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={UPLOAD.allowedTypes.join(',')}
          multiple
          onChange={handleInputChange}
          disabled={uploading}
          style={{ display: 'none' }}
          id={`upload-${mediaType}`}
        />

        {uploading ? (
          <>
            <div className="upload-zone__title">Mengupload… {progress}%</div>
            <div className="upload-progress">
              <div className="upload-progress__bar" style={{ width: `${progress}%` }} />
            </div>
          </>
        ) : (
          <>
            <div className="upload-zone__icon" aria-hidden="true">
              {isDragging ? '⬇' : '🖼'}
            </div>
            <div className="upload-zone__title">
              {isDragging ? 'Lepaskan di sini' : 'Seret foto ke sini, tempel (Ctrl+V), atau klik untuk pilih file'}
            </div>
            <div className="upload-zone__meta">
              JPG / PNG / WEBP · maks {formatBytes(UPLOAD.maxFileSizeBytes)} per file · maks{' '}
              {UPLOAD.maxFilesPerUpload} file sekali kirim
            </div>
            {aktif && (
              <div className="upload-zone__badge">
                Siap menerima tempelan — screenshot bisa langsung Ctrl+V
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
