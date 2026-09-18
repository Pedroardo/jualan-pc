import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import ProductCard from '../components/ProductCard.jsx';

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/products', { params: { pageSize: 24 } })
      .then((res) => setProducts(res.data.products))
      .catch(() => setError('Gagal memuat data produk. Coba muat ulang halaman.'))
      .finally(() => setLoading(false));
  }, []);

  // useMemo: filter hanya dihitung ulang saat `products` benar-benar berubah,
  // bukan setiap kali komponen re-render.
  const tersedia = useMemo(() => products.filter((p) => p.status === 'available'), [products]);
  const terjual = useMemo(() => products.filter((p) => p.status === 'sold'), [products]);

  return (
    <>
      <section className="hero">
        <div className="hero__inner">
          <h1>Unit PC Gaming</h1>
          <div className="hero__stats">
            <div className="hero__stat">
              <div className="hero__stat-value">{tersedia.length}</div>
              <div className="hero__stat-label">Tersedia</div>
            </div>
            <div className="hero__stat">
              <div className="hero__stat-value">{terjual.length}</div>
              <div className="hero__stat-label">Terjual</div>
            </div>
          </div>
        </div>
      </section>

      {loading && <div className="page-loading">Memuat unit…</div>}
      {error && <div className="empty-state">{error}</div>}

      {!loading && !error && products.length === 0 && (
        <div className="empty-state">Belum ada unit yang ditambahkan.</div>
      )}

      {!loading && !error && tersedia.length > 0 && (
        <section className="product-section">
          <div className="container">
            <h2 className="product-section__title">Tersedia</h2>
          </div>
          <div className="product-grid">
            {tersedia.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {!loading && !error && terjual.length > 0 && (
        <section className="product-section">
          <div className="container">
            <h2 className="product-section__title">Sudah Terjual</h2>
          </div>
          <div className="product-grid product-grid--sold">
            {terjual.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
