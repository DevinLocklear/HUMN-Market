import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabase';

export default function Profile({ session }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [listings, setListings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const isOwn = session?.user?.id === id;

  useEffect(() => {
    async function fetch() {
      const [{ data: prof }, { data: lists }, { data: revs }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).single(),
        supabase.from('listings').select('*').eq('seller_id', id).eq('status', 'active').order('created_at', { ascending: false }),
        supabase.from('reviews').select('*, reviewer:reviewer_id(username, avatar_url)').eq('reviewee_id', id).order('created_at', { ascending: false }),
      ]);
      setProfile(prof);
      setListings(lists || []);
      setReviews(revs || []);
      setLoading(false);
    }
    fetch();
  }, [id]);

  function Stars({ rating }) {
    return (
      <div className="stars">
        {[1,2,3,4,5].map(n => <span key={n} className={`star ${n <= rating ? '' : 'empty'}`}>★</span>)}
      </div>
    );
  }

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;
  if (!profile) return <div className="page-loading"><p>User not found</p></div>;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)' }}>
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-logo" onClick={() => navigate('/')}><img src="https://i.imgur.com/ywgtHOK.png" alt="HUMN" />HUMN <span>Market</span></div>
          <div className="nav-actions">
            <button className="btn-secondary" onClick={() => navigate('/browse')} style={{ padding: '8px 16px', fontSize: 13 }}>Browse</button>
            {session && <button className="btn-primary" onClick={() => navigate('/sell')} style={{ padding: '8px 16px', fontSize: 13 }}>Sell</button>}
          </div>
        </div>
      </nav>

      <div className="page-wrapper" style={{ maxWidth: 960 }}>
        {/* Profile header */}
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16, padding: '28px 32px', display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24, boxShadow: 'var(--shadow-sm)' }}>
          {profile.avatar_url
            ? <img src={profile.avatar_url} alt="" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-mid)', flexShrink: 0 }} />
            : <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{profile.username?.[0]?.toUpperCase() || '?'}</div>
          }
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em' }}>{profile.username || 'Unnamed Seller'}</h1>
              {profile.sales_completed >= 5 && profile.seller_rating >= 4 && (
                <div style={{ background: 'var(--accent)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>✓ Verified</div>
              )}
            </div>
            {profile.bio && <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 10 }}>{profile.bio}</p>}
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}><strong style={{ color: 'var(--text)' }}>{profile.sales_completed || 0}</strong> sales</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}><strong style={{ color: 'var(--text)' }}>{listings.length}</strong> active listings</div>
              {profile.seller_rating > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Stars rating={Math.round(profile.seller_rating)} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{profile.seller_rating.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>
          {isOwn && (
            <button className="btn-secondary" onClick={() => navigate('/dashboard')} style={{ padding: '8px 16px', fontSize: 13, flexShrink: 0 }}>Edit Profile</button>
          )}
        </div>

        {/* Listings */}
        {listings.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 16 }}>Active Listings ({listings.length})</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
              {listings.map(l => (
                <div key={l.id} className="listing-card" onClick={() => navigate(`/listing/${l.id}`)}>
                  {l.image_url ? <img src={l.image_url} alt={l.title} className="listing-card-img" /> : <div className="listing-card-img-placeholder">🃏</div>}
                  <div className="listing-card-body">
                    <div className="listing-card-title">{l.title}</div>
                    {l.set_name && <div className="listing-card-set">{l.set_name}</div>}
                    <div className="listing-card-footer">
                      <div className="listing-card-price">${l.price.toFixed(2)}</div>
                      <span className="tag tag-accent" style={{ fontSize: 10 }}>{l.condition}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 16 }}>Reviews ({reviews.length})</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {reviews.map(r => (
                <div key={r.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
                      {r.reviewer?.avatar_url
                        ? <img src={r.reviewer.avatar_url} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                        : <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>{r.reviewer?.username?.[0]?.toUpperCase()}</div>
                      }
                      {r.reviewer?.username}
                    </div>
                    <Stars rating={r.rating} />
                  </div>
                  {r.comment && <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{r.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {listings.length === 0 && reviews.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 32px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16, color: 'var(--text-secondary)' }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>🃏</p>
            <p style={{ fontWeight: 600 }}>No activity yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
