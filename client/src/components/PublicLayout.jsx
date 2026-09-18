import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { SITE, WHATSAPP } from '../config/site.js';
import WhatsAppButton from './WhatsAppButton.jsx';

export default function PublicLayout() {
  return (
    <div>
      <header className="site-header">
        <div className="site-header__inner">
          <Link to="/" className="brand">
            <span className="brand__icon">{SITE.name.charAt(0)}</span>
            <span className="brand__text">
              {SITE.name}
              <small className="brand__tagline">{SITE.tagline}</small>
            </span>
          </Link>

          {/* Tombol WA di header — selalu terlihat, tidak mengganggu konten */}
          <WhatsAppButton label="Hubungi" />
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="site-footer">
        <a href={`https://wa.me/${WHATSAPP.number}`} target="_blank" rel="noopener noreferrer">
          WhatsApp: {WHATSAPP.displayNumber}
        </a>
      </footer>

      {/* Tombol melayang — jalan pintas menghubungi dari halaman mana pun */}
      <WhatsAppButton floating />
    </div>
  );
}
