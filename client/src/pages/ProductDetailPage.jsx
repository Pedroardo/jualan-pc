import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { formatRupiah, formatDate } from '../utils/format.js';
import Lightbox from '../components/Lightbox.jsx';
import WhatsAppButton from '../components/WhatsAppButton.jsx';
import { SITE } from '../config/site.js';

const SPEC_LABELS = [
  ['spec_cpu', 'Processor'],
  ['spec_gpu', 'Kartu Grafis'],
  ['spec_motherboard', 'Motherboard'],
  ['spec_ram', 'RAM'],
  ['spec_storage', 'Penyimpanan'],
  ['spec_psu', 'Power Supply'],
  ['spec_case', 'Casing'],
  ['spec_other', 'Lainnya'],
];

export default function ProductDetailPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activePhoto, setActivePhoto] = useState(0);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/products/${id}`)
      .then((res) => {
        setProduct(res.data.product);
        setActivePhoto(0);
      })
      .catch(() => setError('Unit tidak ditemukan.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page-loading">Memuat…</div>;
  if (error || !product) return <div className="empty-state">{error || 'Unit tidak ditemukan.'}</div>;

  const photos = product.photos || [];
  const mainPhoto = photos[activePhoto];
  const tersedia = product.status === 'available';

  // Pesan WA dibuat spesifik per unit, supaya saat chat masuk Anda langsung
  // tahu unit mana yang ditanyakan tanpa perlu bertanya balik.
  const pesanWa = tersedia
    ? `Halo ${SITE.name}, saya tertarik dengan unit "${product.title}" yang masih tersedia. Apakah masih ready?`
    : `Halo ${SITE.name}, saya lihat unit "${product.title}" di portofolio. Bisa dibuatkan spek serupa?`;

  return (
    <div className="detail-layout">
      <div>
        <Link to="/" className="back-link">
          ← Kembali ke daftar unit
        </Link>

        <div className="gallery-main">
          {mainPhoto ? (
            <img
              src={mainPhoto.url}
              alt={product.title}
              onClick={() => setLightboxSrc(mainPhoto.url)}
              style={{ cursor: 'zoom-in' }}
            />
          ) : (
            'Belum ada foto'
          )}
        </div>

        {photos.length > 1 && (
          <div className="gallery-thumbs">
            {photos.map((p, i) => (
              <button
                key={p.id}
                className={`gallery-thumb ${i === activePhoto ? 'active' : ''}`}
                onClick={() => setActivePhoto(i)}
                aria-label={`Lihat foto ${i + 1}`}
              >
                <img src={p.url} alt="" />
              </button>
            ))}
          </div>
        )}

        {product.proofs?.length > 0 && (
          <div className="proof-section">
            <h3>Bukti transaksi</h3>
            <p className="hint">Tangkapan layar chat dan/atau bukti transfer dari pembeli.</p>
            <div className="proof-grid">
              {product.proofs.map((p) => (
                <img key={p.id} src={p.url} alt="Bukti transaksi" onClick={() => setLightboxSrc(p.url)} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="detail-info">
        <h1>{product.title}</h1>
        <div className="detail-price">{formatRupiah(product.price_sold)}</div>

        {product.description && <p className="description">{product.description}</p>}

        <dl className="spec-table">
          {SPEC_LABELS.filter(([key]) => product[key]).map(([key, label]) => (
            <div className="spec-row" key={key}>
              <dt>{label}</dt>
              <dd>{product[key]}</dd>
            </div>
          ))}
          <div className="spec-row">
            <dt>Tanggal terjual</dt>
            <dd>{formatDate(product.sold_at)}</dd>
          </div>
        </dl>

        {/* Ajakan menghubungi — kalimatnya menyesuaikan status unit */}
        <div className="contact-cta">
          <div className="contact-cta__text">
            {tersedia
              ? 'Unit ini masih tersedia. Tanyakan ketersediaan dan nego lewat WhatsApp.'
              : 'Unit ini sudah terjual. Mau dibuatkan rakitan dengan spek serupa atau sesuai budget Anda?'}
          </div>
          <WhatsAppButton
            message={pesanWa}
            label={tersedia ? 'Tanya ketersediaan' : 'Konsultasi rakitan serupa'}
          />
        </div>
      </div>

      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  );
}
