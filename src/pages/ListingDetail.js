import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabase';
import './ListingDetail.css';

function parseListingContent(raw) {
  if (!raw) return { specs: null, description: null };
  if (raw.startsWith('SPECS:')) {
    const separator = '\nDESC:';
    const descIdx = raw.indexOf(separator);
    const specsStr = descIdx > -1 ? raw.slice(6, descIdx) : raw.slice(6);
    const descStr = descIdx > -1 ? raw.slice(descIdx + separator.length) : null;
    try { return { specs: JSON.parse(specsStr), description: descStr }; }
    catch { return { specs: null, description: raw }; }
  }
  try { const s = JSON.parse(raw); return { specs: s, description: null }; }
  catch { return { specs: null, description: raw }; }
}

export default function ListingDetail({ session }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [seller, setSeller] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [watchlisted, setWatchlisted] = useState(false);
  const [moreListings, setMoreListings] = useState([]);

  useEffect(() => {
    fetchListing();
  }, [id]); // eslint-disable-line

  async function fetchListing() {
    setLoading(true);
    const { data } = await supabase.from('listings').select('*, profiles(*)').eq('id', id).single();
    if (!data) { navigate('/browse'); return; }
    setListing(data);
    setSeller(data.profiles);

    const { data: revs } = await supabase.from('reviews').select('*, reviewer:reviewer_id(username, avatar_url)').eq('reviewee_id', data.seller_id).order('created_at', { ascending: false }).limit(5);
    setReviews(revs || []);

    const { data: more } = await supabase.from('listings').select('*').eq('seller_id', data.seller_id).eq('status', 'active').neq('id', id).limit(4);
    setMoreListings(more || []);

    if (session) {
      const { data: wl } = await supabase.from('watchlist').select('id').eq('user_id', session.user.id).eq('listing_id', id).single();
      setWatchlisted(!!wl);
    }
    setLoading(false);
  }

  async function toggleWatchlist() {
    if (!session) { navigate('/auth'); return; }
    if (watchlisted) {
      await supabase.from('watchlist').delete().eq('user_id', session.user.id).eq('listing_id', id);
      setWatchlisted(false);
    } else {
      await supabase.from('watchlist').insert({ user_id: session.user.id, listing_id: id });
      setWatchlisted(true);
    }
  }

  async function handleBuy() {
    if (!session) { navigate('/auth'); return; }
    if (listing.seller_id === session.user.id) { alert("You can't buy your own listing."); return; }
    setBuying(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listing.id,
          buyer_id: session.user.id,
          seller_id: listing.seller_id,
          price: listing.price,
          title: listing.title,
          image_url: listing.image_url,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to start checkout');
      }
    } catch (e) {
      alert('Checkout failed. Please try again.');
    }
    setBuying(false);
  }

  function Stars({ rating }) {
    return (
      <div className="stars">
        {[1,2,3,4,5].map(n => <span key={n} className={`star ${n <= rating ? '' : 'empty'}`}>★</span>)}
      </div>
    );
  }

  const total = listing ? listing.price.toFixed(2) : '0.00';

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

  return (
    <div className="detail-page">
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-logo" onClick={() => navigate('/')}><img src="https://i.imgur.com/ywgtHOK.png" alt="HUMN" />HUMN <span>Market</span></div>
          <div className="nav-actions">
            <button className="btn-secondary" onClick={() => navigate('/browse')} style={{ padding: '8px 16px', fontSize: 13 }}>← Browse</button>
            {session ? (
              <button className="btn-primary" onClick={() => navigate('/sell')} style={{ padding: '8px 16px', fontSize: 13 }}>Sell</button>
            ) : (
              <button className="btn-primary" onClick={() => navigate('/auth')} style={{ padding: '8px 16px', fontSize: 13 }}>Sign in</button>
            )}
          </div>
        </div>
      </nav>

      <div className="detail-layout">
        {/* Left: image */}
        <div className="detail-image-col">
          <div className="detail-image-wrap">
            {listing.image_url
              ? <img src={listing.image_url} alt={listing.title} className="detail-image" />
              : <div className="detail-image-placeholder">🃏</div>
            }
          </div>
        </div>

        {/* Right: info + buy */}
        <div className="detail-info-col">
          <div className="detail-breadcrumb" onClick={() => navigate('/browse')}>← Back to listings</div>

          <div className="detail-tags">
            <span className={`tag ${listing.condition === 'Raw' ? 'tag-accent' : listing.condition?.startsWith('PSA') ? 'tag-gold' : listing.condition === 'Sealed' ? 'tag-green' : 'tag-accent'}`}>{listing.condition}</span>
            {listing.item_type === 'sealed' && <span className="tag tag-green">SEALED</span>}
          </div>

          <h1 className="detail-title">{listing.title}</h1>
          {listing.set_name && <div className="detail-set">{listing.set_name}</div>}
          {listing.card_name && listing.card_name !== listing.title && <div className="detail-card-name">{listing.card_name}</div>}

          <div className="detail-price">${listing.price.toFixed(2)}</div>

          {(() => {
            const { specs, description } = parseListingContent(listing.description);
            return (
              <>
                {description && <p className="detail-description">{description}</p>}
                {specs?.condition_description && <p className="detail-description" style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>"{specs.condition_description}"</p>}

                {/* Item specifics table */}
                <div className="detail-specs-table">
                  {[
                    ['Condition', listing.condition],
                    ['Type', listing.item_type === 'sealed' ? 'Sealed Product' : 'Single Card'],
                    specs?.card_number ? ['Card Number', specs.card_number] : null,
                    specs?.language && specs.language !== 'English' ? ['Language', specs.language] : null,
                    specs?.grading_company ? ['Graded By', specs.grading_company] : null,
                    specs?.grade ? ['Grade', specs.grade] : null,
                    specs?.holo ? ['Holo', 'Yes'] : null,
                    specs?.first_edition ? ['1st Edition', 'Yes'] : null,
                    ['Quantity', listing.quantity],
                    specs?.shipping_type === 'free' ? ['Shipping', 'Free'] : specs?.shipping_cost ? ['Shipping', `$${parseFloat(specs.shipping_cost).toFixed(2)} · ${specs.shipping_carrier || ''}`] : null,
                    specs?.handling_time ? ['Handling Time', `Ships within ${specs.handling_time} day${specs.handling_time > 1 ? 's' : ''}`] : null,
                    specs?.returns_policy ? ['Returns', specs.returns_policy] : null,
                    specs?.best_offer ? ['Best Offer', specs.best_offer_min ? `Yes (min $${specs.best_offer_min})` : 'Yes'] : null,
                    ['Listed', new Date(listing.created_at).toLocaleDateString()],
                  ].filter(Boolean).map(([label, val]) => (
                    <div key={label} className="detail-spec-row">
                      <div className="detail-spec-label">{label}</div>
                      <div className="detail-spec-val">{val}</div>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}

          {/* Buy box */}
          <div className="buy-box">
            <div className="buy-box-price">
              <div className="buy-box-total">${total}</div>
              <div className="buy-box-fees">Buyer pays no fees · Seller pays 5%</div>
            </div>
            {listing.status === 'active' ? (
              <>
                <button className="btn-buy" onClick={handleBuy} disabled={buying || listing.seller_id === session?.user?.id}>
                  {buying ? 'Redirecting...' : listing.seller_id === session?.user?.id ? 'Your Listing' : '🔒 Buy Now'}
                </button>
                <button className={`watchlist-btn-full ${watchlisted ? 'saved' : ''}`} onClick={toggleWatchlist}>
                  {watchlisted ? '♥ Saved to Watchlist' : '♡ Save to Watchlist'}
                </button>
              </>
            ) : (
              <div className="sold-badge">SOLD</div>
            )}
            <div className="buy-protection">
              <div className="buy-protection-item">🔒 Secure Stripe checkout</div>
              <div className="buy-protection-item">📦 Seller must ship within 3 days</div>
              <div className="buy-protection-item">🛡️ Dispute protection included</div>
            </div>
          </div>

          {/* Seller info */}
          <div className="seller-card">
            <div className="seller-card-header">
              <div className="seller-info" onClick={() => navigate(`/profile/${listing.seller_id}`)}>
                {seller?.avatar_url
                  ? <img src={seller.avatar_url} alt="" className="seller-avatar" />
                  : <div className="seller-avatar-init">{seller?.username?.[0]?.toUpperCase() || '?'}</div>
                }
                <div>
                  <div className="seller-name">{seller?.username || 'Seller'}</div>
                  <div className="seller-meta">{seller?.sales_completed || 0} sales completed</div>
                </div>
              </div>
              {seller?.seller_rating > 0 && (
                <div className="seller-rating">
                  <Stars rating={Math.round(seller.seller_rating)} />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{seller.seller_rating.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reviews */}
      {reviews.length > 0 && (
        <div className="detail-reviews">
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px 48px' }}>
            <h2 className="detail-reviews-title">Seller Reviews</h2>
            <div className="reviews-grid">
              {reviews.map(r => (
                <div key={r.id} className="review-card">
                  <div className="review-header">
                    <div className="review-reviewer">
                      {r.reviewer?.avatar_url
                        ? <img src={r.reviewer.avatar_url} alt="" className="review-avatar" />
                        : <div className="review-avatar-init">{r.reviewer?.username?.[0]?.toUpperCase()}</div>
                      }
                      <span>{r.reviewer?.username}</span>
                    </div>
                    <Stars rating={r.rating} />
                  </div>
                  {r.comment && <p className="review-comment">{r.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* More from seller */}
      {moreListings.length > 0 && (
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px 48px' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 20 }}>More from this seller</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {moreListings.map(l => (
              <div key={l.id} className="listing-card" onClick={() => navigate(`/listing/${l.id}`)}>
                {l.image_url ? <img src={l.image_url} alt={l.title} className="listing-card-img" /> : <div className="listing-card-img-placeholder">🃏</div>}
                <div className="listing-card-body">
                  <div className="listing-card-title">{l.title}</div>
                  <div className="listing-card-footer">
                    <div className="listing-card-price">${l.price.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
