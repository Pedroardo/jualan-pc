import React from 'react';
import { Link } from 'react-router-dom';
import { formatRupiah, formatDate } from '../utils/format.js';

function ProductCard({ product }) {
  const cover = product.photos?.[0];
  const sold = product.status === 'sold';

  return (
    <Link
      to={`/produk/${product.id}`}
      className={`product-card ${sold ? 'product-card--sold' : ''}`}
    >
      <div className="product-card__image">
        {cover ? <img src={cover.url} alt={product.title} loading="lazy" /> : 'Belum ada foto'}
        <span className={`status-pill ${sold ? 'status-pill--sold' : 'status-pill--available'}`}>
          {sold ? 'Terjual' : 'Tersedia'}
        </span>
      </div>
      <div className="product-card__body">
        <div className="product-card__title">{product.title}</div>
        <div className="product-card__specs">
          {product.spec_cpu && <span>{product.spec_cpu}</span>}
          {product.spec_gpu && <span>{product.spec_gpu}</span>}
        </div>
        <div className="product-card__footer">
          <span className="price">{formatRupiah(product.price_sold)}</span>
          {sold && <span className="sold-date">{formatDate(product.sold_at)}</span>}
        </div>
      </div>
    </Link>
  );
}

// React.memo: kartu ini murni tampilan dari satu `product`. Tanpa memo,
// setiap re-render HomePage (misal saat state lain berubah) akan
// me-render ulang SEMUA kartu di grid meski datanya sama persis.
export default React.memo(ProductCard);
