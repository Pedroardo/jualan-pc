import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api, extractErrorMessage } from '../../api/client.js';
import MediaUploader from '../../components/MediaUploader.jsx';

const EMPTY_FORM = {
  title: '',
  description: '',
  spec_cpu: '',
  spec_gpu: '',
  spec_motherboard: '',
  spec_ram: '',
  spec_storage: '',
  spec_psu: '',
  spec_case: '',
  spec_other: '',
  price_sold: '',
  status: 'sold',
  sold_at: '',
  buyer_note: '',
};

export default function AdminProductForm({ mode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = mode === 'edit';

  const [form, setForm] = useState(EMPTY_FORM);
  const [productId, setProductId] = useState(isEdit ? id : null);
  const [photos, setPhotos] = useState([]);
  const [proofs, setProofs] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    api
      .get(`/products/${id}`)
      .then((res) => {
        const p = res.data.product;
        setForm({
          title: p.title || '',
          description: p.description || '',
          spec_cpu: p.spec_cpu || '',
          spec_gpu: p.spec_gpu || '',
          spec_motherboard: p.spec_motherboard || '',
          spec_ram: p.spec_ram || '',
          spec_storage: p.spec_storage || '',
          spec_psu: p.spec_psu || '',
          spec_case: p.spec_case || '',
          spec_other: p.spec_other || '',
          price_sold: p.price_sold ?? '',
          status: p.status || 'sold',
          sold_at: p.sold_at || '',
          buyer_note: p.buyer_note || '',
        });
        setPhotos(p.photos || []);
        setProofs(p.proofs || []);
      })
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      if (isEdit) {
        await api.put(`/products/${id}`, form);
        setSuccess('Perubahan disimpan.');
      } else {
        const res = await api.post('/products', form);
        const newId = res.data.product.id;
        setProductId(newId);
        setSuccess('Unit berhasil dibuat. Sekarang tambahkan foto produk & bukti transaksi di bawah, lalu klik "Selesai".');
        navigate(`/admin/produk/${newId}/edit`, { replace: true });
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'Gagal menyimpan data.'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="page-loading">Memuat…</div>;

  return (
    <div className="admin-shell">
      <div className="admin-topbar">
        <Link to="/admin" className="back-link" style={{ margin: 0 }}>
          ← Kembali ke daftar
        </Link>
      </div>

      <div className="admin-content" style={{ maxWidth: 720 }}>
        <h1 style={{ fontSize: '1.4rem', marginBottom: 24 }}>
          {isEdit ? 'Edit Unit PC' : 'Tambah Unit PC Baru'}
        </h1>

        {error && <div className="form-error">{error}</div>}
        {success && <div className="form-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="title">Judul Unit *</label>
            <input
              id="title"
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder='Misal: "PC Gaming Ryzen 5 5600 + RTX 3060"'
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="description">Deskripsi</label>
            <textarea
              id="description"
              rows={4}
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Cerita singkat tentang build ini, kondisi barang, dsb."
            />
          </div>

          <h3 className="section-title">Spesifikasi</h3>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="spec_cpu">Processor</label>
              <input id="spec_cpu" value={form.spec_cpu} onChange={(e) => updateField('spec_cpu', e.target.value)} placeholder="AMD Ryzen 5 5600" />
            </div>
            <div className="form-field">
              <label htmlFor="spec_gpu">Kartu Grafis</label>
              <input id="spec_gpu" value={form.spec_gpu} onChange={(e) => updateField('spec_gpu', e.target.value)} placeholder="RTX 3060 12GB" />
            </div>
            <div className="form-field">
              <label htmlFor="spec_motherboard">Motherboard</label>
              <input id="spec_motherboard" value={form.spec_motherboard} onChange={(e) => updateField('spec_motherboard', e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="spec_ram">RAM</label>
              <input id="spec_ram" value={form.spec_ram} onChange={(e) => updateField('spec_ram', e.target.value)} placeholder="16GB DDR4 3200MHz" />
            </div>
            <div className="form-field">
              <label htmlFor="spec_storage">Penyimpanan</label>
              <input id="spec_storage" value={form.spec_storage} onChange={(e) => updateField('spec_storage', e.target.value)} placeholder="512GB NVMe SSD" />
            </div>
            <div className="form-field">
              <label htmlFor="spec_psu">Power Supply</label>
              <input id="spec_psu" value={form.spec_psu} onChange={(e) => updateField('spec_psu', e.target.value)} placeholder="600W 80+ Bronze" />
            </div>
            <div className="form-field">
              <label htmlFor="spec_case">Casing</label>
              <input id="spec_case" value={form.spec_case} onChange={(e) => updateField('spec_case', e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="spec_other">Lainnya</label>
              <input id="spec_other" value={form.spec_other} onChange={(e) => updateField('spec_other', e.target.value)} placeholder="Monitor, cooler, dll" />
            </div>
          </div>

          <h3 className="section-title">Transaksi</h3>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="price_sold">Harga Terjual (Rp) *</label>
              <input
                id="price_sold"
                type="number"
                min="0"
                value={form.price_sold}
                onChange={(e) => updateField('price_sold', e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="status">Status</label>
              <select id="status" value={form.status} onChange={(e) => updateField('status', e.target.value)}>
                <option value="sold">Terjual</option>
                <option value="available">Tersedia</option>
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="sold_at">Tanggal Terjual</label>
              <input id="sold_at" type="date" value={form.sold_at} onChange={(e) => updateField('sold_at', e.target.value)} />
            </div>
            <div className="form-field">
              <label htmlFor="buyer_note">Catatan Pembeli (opsional)</label>
              <input
                id="buyer_note"
                value={form.buyer_note}
                onChange={(e) => updateField('buyer_note', e.target.value)}
                placeholder="Misal: inisial atau kota, jaga privasi pembeli"
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: 12 }}>
            {saving ? 'Menyimpan…' : isEdit ? 'Simpan Perubahan' : 'Buat Unit & Lanjut Upload Foto'}
          </button>
        </form>

        {productId && (
          <>
            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '40px 0' }} />
            <MediaUploader
              productId={productId}
              mediaType="product_photo"
              label="Foto Produk"
              hint="Foto unit PC dari berbagai sisi. Foto pertama akan jadi sampul di halaman utama."
              existingMedia={photos}
              onChange={setPhotos}
            />
            <MediaUploader
              productId={productId}
              mediaType="proof_photo"
              label="Bukti Transaksi"
              hint="Tangkapan layar chat, bukti transfer, dll. Sensor info sensitif pembeli sebelum upload."
              existingMedia={proofs}
              onChange={setProofs}
            />

            <Link to="/admin" className="btn btn-primary" style={{ marginTop: 24, display: 'inline-flex' }}>
              Selesai — Kembali ke Daftar
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
