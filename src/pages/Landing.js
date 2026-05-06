import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import './Landing.css';

export default function Landing({ session }) {
  const navigate = useNavigate();
  const [featured, setFeatured] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [navDropOpen, setNavDropOpen] = useState(false);

  useEffect(() => {
    supabase.from('listings').select('*, profiles(username, seller_rating)').eq('status', 'active').order('created_at', { ascending: false }).limit(8)
      .then(({ data }) => setFeatured(data || []));
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    navigate(`/browse?q=${encodeURIComponent(searchQuery)}`);
  }

  const categories = [
    { label: 'Scarlet & Violet', emoji: '🔴', q: 'Scarlet Violet' },
    { label: 'PSA Graded', emoji: '🏆', q: 'PSA' },
    { label: 'Sealed Product', emoji: '📦', q: 'sealed' },
    { label: 'Vintage', emoji: '⭐', q: 'Base Set' },
    { label: 'Alt Art', emoji: '🎨', q: 'Alt Art' },
    { label: 'Full Art', emoji: '✨', q: 'Full Art' },
  ];

  return (
    <div className="landing">
      {/* Nav */}
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-logo" onClick={() => navigate('/')}>
            <img src="https://i.imgur.com/ywgtHOK.png" alt="HUMN" />
            HUMN <span>Market</span>
          </div>
          <div className="nav-actions">
            {session ? (
              <div style={{ position: 'relative' }}>
                <div className="nav-user" onClick={() => setNavDropOpen(o => !o)}>
                  {session.user?.user_metadata?.avatar_url
                    ? <img src={session.user.user_metadata.avatar_url} alt="" className="nav-avatar" />
                    : <div className="nav-avatar-init">{session.user?.email?.[0]?.toUpperCase()}</div>
                  }
                  <span>{session.user?.user_metadata?.full_name?.split(' ')[0] || session.user?.email?.split('@')[0]}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>▾</span>
                </div>
                {navDropOpen && (
                  <div className="nav-dropdown">
                    <div className="nav-dropdown-email">{session.user?.email}</div>
                    {[['🏠 Dashboard', '/dashboard'], ['🛍️ Browse', '/browse'], ['💰 Sell', '/sell'], ['📦 Orders', '/orders']].map(([label, path]) => (
                      <div key={path} className="nav-dropdown-item" onClick={() => { navigate(path); setNavDropOpen(false); }}>{label}</div>
                    ))}
                    <div className="nav-dropdown-divider" />
                    <div className="nav-dropdown-item" onClick={async () => { await supabase.auth.signOut(); setNavDropOpen(false); }}>Sign Out</div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button className="btn-secondary" onClick={() => navigate('/auth')} style={{ padding: '8px 16px' }}>Sign in</button>
                <button className="btn-primary" onClick={() => navigate('/auth')} style={{ padding: '8px 16px' }}>Start selling</button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-eyebrow">🔥 Pokemon TCG Marketplace</div>
          <h1 className="hero-title">Buy and sell Pokemon cards.<br />Lower fees than anywhere else.</h1>
          <p className="hero-sub">Just 5% seller fees. Secure Stripe payments. Verified sellers.</p>
          <form className="hero-search" onSubmit={handleSearch}>
            <span className="hero-search-icon">🔍</span>
            <input
              placeholder="Search cards, sets, sellers..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="btn-primary">Search</button>
          </form>
          <div className="hero-trust">
            <div className="hero-trust-item">✓ Stripe-secured payments</div>
            <div className="hero-trust-item">✓ Seller protection</div>
            <div className="hero-trust-item">✓ Only 5% fees</div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="categories-section">
        <div className="section-inner">
          <h2 className="section-title">Browse by category</h2>
          <div className="categories-grid">
            {categories.map((cat, i) => (
              <div key={i} className="category-card" onClick={() => navigate(`/browse?q=${cat.q}`)}>
                <div className="category-emoji">{cat.emoji}</div>
                <div className="category-label">{cat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured listings */}
      <section className="featured-section">
        <div className="section-inner">
          <div className="section-header">
            <h2 className="section-title">Recently listed</h2>
            <button className="btn-secondary" onClick={() => navigate('/browse')} style={{ padding: '8px 16px', fontSize: 13 }}>View all →</button>
          </div>
          {featured.length === 0 ? (
            <div className="featured-empty">
              <p>No listings yet — be the first to sell!</p>
              <button className="btn-primary" onClick={() => navigate(session ? '/sell' : '/auth')} style={{ marginTop: 16 }}>List a Card</button>
            </div>
          ) : (
            <div className="featured-grid">
              {featured.map(listing => (
                <div key={listing.id} className="listing-card" onClick={() => navigate(`/listing/${listing.id}`)}>
                  {listing.image_url
                    ? <img src={listing.image_url} alt={listing.title} className="listing-card-img" />
                    : <div className="listing-card-img-placeholder">🃏</div>
                  }
                  <div className="listing-card-body">
                    <div className="listing-card-title">{listing.title}</div>
                    {listing.set_name && <div className="listing-card-set">{listing.set_name}</div>}
                    <div className="listing-card-footer">
                      <div className="listing-card-price">${listing.price.toFixed(2)}</div>
                      <div className="listing-card-seller">by {listing.profiles?.username || 'Seller'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Why HUMN */}
      <section className="why-section">
        <div className="section-inner">
          <h2 className="section-title">Why sell on HUMN Market?</h2>
          <div className="why-grid">
            {[
              { icon: '💸', title: 'Only 5% fees', desc: 'TCGPlayer charges 10.25% + payment fees. We charge 5%, flat. More money in your pocket.' },
              { icon: '⚡', title: 'Instant payouts', desc: 'Get paid directly to your bank via Stripe. No waiting, no holds on legitimate sales.' },
              { icon: '🛡️', title: 'Buyer & seller protection', desc: 'Stripe handles payment disputes. Our trust score system filters out bad actors.' },
              { icon: '🃏', title: 'Pokemon-only', desc: 'A marketplace built specifically for Pokemon TCG collectors. No clutter, no noise.' },
            ].map((item, i) => (
              <div key={i} className="why-card">
                <div className="why-icon">{item.icon}</div>
                <div className="why-title">{item.title}</div>
                <div className="why-desc">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-inner">
          <h2 className="cta-title">Ready to start selling?</h2>
          <p className="cta-sub">List your first card in under 2 minutes. Free to join.</p>
          <div className="cta-actions">
            <button className="btn-primary" onClick={() => navigate(session ? '/sell' : '/auth')} style={{ padding: '13px 28px', fontSize: 15 }}>
              List a card →
            </button>
            <button className="btn-secondary" onClick={() => navigate('/browse')} style={{ padding: '13px 28px', fontSize: 15 }}>
              Browse listings
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-logo">
            <img src="https://i.imgur.com/ywgtHOK.png" alt="HUMN" style={{ width: 20, height: 20, borderRadius: 5, objectFit: 'contain' }} />
            HUMN <span>Market</span>
          </div>
          <div className="footer-links">
            <a href="https://x.com/UseHUMN" target="_blank" rel="noreferrer">Twitter</a>
            <a href="https://humnbot.com" target="_blank" rel="noreferrer">HUMN Bot</a>
          </div>
          <div className="footer-copy">© 2025 HUMN Market</div>
        </div>
      </footer>
    </div>
  );
}
