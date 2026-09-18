import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, extractErrorMessage } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatRupiah, formatDate } from '../../utils/format.js';
import { SITE } from '../../config/site.js';

export default function AdminDashboard() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function loadProducts() {
    setLoading(true);
    api
      .get('/products', { params: { pageSize: 50 } })
      .then((res) => setProducts(res.data.products))
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(loadProducts, []);

  async function handleDelete(id, title) {
    if (!window.confirm(`Hapus unit "${title}"? Semua foto terkait juga akan dihapus. Tindakan ini tidak bisa dibatalkan.`)) {
      return;
    }
    try {
      await api.delete(`/products/${id}`);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert(extractErrorMessage(err, 'Gagal menghapus produk.'));
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/admin/login');
  }

  return (
    <div className="admin-shell">
      <div className="admin-topbar">
        <span className="brand">
          <span className="brand__icon">{SITE.name.charAt(0)}</span>
          {SITE.name} — admin
        </span>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>{admin?.username}</span>
          <button className="btn" onClick={handleLogout}>
            Keluar
          </button>
        </div>
      </div>

      <div className="admin-content">
        <div className="admin-header-row">
          <h1 style={{ fontSize: '1.4rem' }}>Daftar Unit PC</h1>
          <Link to="/admin/produk/baru" className="btn btn-primary">
            + Tambah Unit
          </Link>
        </div>

        {loading && <p style={{ color: 'var(--text-dim)' }}>Memuat…</p>}
        {error && <div className="form-error">{error}</div>}

        {!loading && !error && products.length === 0 && (
          <p style={{ color: 'var(--text-dim)' }}>Belum ada unit. Klik "Tambah Unit" untuk mulai.</p>
        )}

        {!loading && !error && products.length > 0 && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Judul</th>
                  <th>Status</th>
                  <th>Harga</th>
                  <th>Tgl Terjual</th>
                  <th>Foto</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>{p.title}</td>
                    <td>
                      <span className={`status-badge ${p.status}`}>{p.status === 'sold' ? 'Terjual' : 'Tersedia'}</span>
                    </td>
                    <td>{formatRupiah(p.price_sold)}</td>
                    <td>{formatDate(p.sold_at)}</td>
                    <td>{p.photos?.length || 0}</td>
                    <td className="admin-table-actions">
                      <Link to={`/admin/produk/${p.id}/edit`} className="btn">
                        Edit
                      </Link>
                      <button className="btn btn-danger" onClick={() => handleDelete(p.id, p.title)}>
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
