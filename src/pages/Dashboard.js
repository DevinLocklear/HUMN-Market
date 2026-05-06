// Dashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import './Dashboard.css';

export default function Dashboard({ session }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [listings, setListings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const [{ data: prof }, { data: lists }, { data: ords }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', session.user.id).single(),
        supabase.from('listings').select('*').eq('seller_id', session.user.id).order('created_at', { ascending: false }),
        supabase.from('orders').select('*, listing:listing_id(title, price)').or(`buyer_id.eq.${session.user.id},seller_id.eq.${session.user.id}`).order('created_at', { ascending: false }).limit(10),
      ]);
      setProfile(prof);
      setListings(lists || []);
      setOrders(ords || []);
      setLoading(false);
    }
    fetchData();
  }, []); // eslint-disable-line

  async function deleteListing(id) {
    await supabase.from('listings').delete().eq('id', id);
    setListings(l => l.filter(x => x.id !== id));
  }

  async function toggleStatus(listing) {
    const newStatus = listing.status === 'active' ? 'inactive' : 'active';
    await supabase.from('listings').update({ status: newStatus }).eq('id', listing.id);
    setListings(l => l.map(x => x.id === listing.id ? { ...x, status: newStatus } : x));
  }

  const activeListings = listings.filter(l => l.status === 'active');
  const totalValue = activeListings.reduce((s, l) => s + l.price, 0);
  const totalSales = orders.filter(o => o.seller_id === session.user.id && o.status === 'completed').reduce((s, o) => s + o.seller_payout, 0);

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

  return (
    <div className="dash-page">
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-logo" onClick={() => navigate('/')}><img src="https://i.imgur.com/ywgtHOK.png" alt="HUMN" />HUMN <span>Market</span></div>
          <div className="nav-actions">
            <button className="btn-secondary" onClick={() => navigate('/browse')} style={{ padding: '8px 16px', fontSize: 13 }}>Browse</button>
            <button className="btn-primary" onClick={() => navigate('/sell')} style={{ padding: '8px 16px', fontSize: 13 }}>+ Sell</button>
            <div onClick={async () => { await supabase.auth.signOut(); navigate('/'); }} style={{ cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)', padding: '8px 12px' }}>Sign out</div>
          </div>
        </div>
      </nav>

      <div className="page-wrapper">
        <div className="dash-header">
          <div className="dash-user-info">
            {session.user?.user_metadata?.avatar_url
              ? <img src={session.user.user_metadata.avatar_url} alt="" className="dash-avatar" />
              : <div className="dash-avatar-init">{session.user?.email?.[0]?.toUpperCase()}</div>
            }
            <div>
              <h1 className="dash-title">{profile?.username || session.user?.email?.split('@')[0]}</h1>
              <p className="dash-sub">Seller dashboard</p>
            </div>
          </div>
          <button className="btn-primary" onClick={() => navigate('/sell')}>+ New Listing</button>
        </div>

        {/* Stats */}
        <div className="dash-stats">
          {[
            { label: 'Active Listings', value: activeListings.length },
            { label: 'Inventory Value', value: `$${totalValue.toFixed(2)}` },
            { label: 'Total Earned', value: `$${totalSales.toFixed(2)}` },
            { label: 'Seller Rating', value: profile?.seller_rating > 0 ? `${profile.seller_rating.toFixed(1)} ★` : '—' },
          ].map((s, i) => (
            <div key={i} className="dash-stat">
              <div className="dash-stat-label">{s.label}</div>
              <div className="dash-stat-value">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Listings */}
        <div className="dash-section">
          <div className="dash-section-header">
            <h2 className="dash-section-title">My Listings</h2>
            <button className="btn-secondary" onClick={() => navigate('/sell')} style={{ padding: '7px 14px', fontSize: 13 }}>+ Add</button>
          </div>
          {listings.length === 0 ? (
            <div className="dash-empty">
              <p>No listings yet</p>
              <button className="btn-primary" onClick={() => navigate('/sell')} style={{ marginTop: 12 }}>Create your first listing</button>
            </div>
          ) : (
            <div className="dash-listings">
              {listings.map(l => (
                <div key={l.id} className="dash-listing-row">
                  <div className="dash-listing-img" onClick={() => navigate(`/listing/${l.id}`)}>
                    {l.image_url ? <img src={l.image_url} alt="" /> : <span>🃏</span>}
                  </div>
                  <div className="dash-listing-info" onClick={() => navigate(`/listing/${l.id}`)}>
                    <div className="dash-listing-title">{l.title}</div>
                    <div className="dash-listing-meta">{l.condition} · {l.set_name || 'No set'}</div>
                  </div>
                  <div className="dash-listing-price">${l.price.toFixed(2)}</div>
                  <div className={`tag ${l.status === 'active' ? 'tag-green' : 'tag-orange'}`}>{l.status}</div>
                  <div className="dash-listing-actions">
                    <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => toggleStatus(l)}>
                      {l.status === 'active' ? 'Pause' : 'Activate'}
                    </button>
                    <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12, color: 'var(--red)', borderColor: 'var(--red)' }} onClick={() => deleteListing(l.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent orders */}
        {orders.length > 0 && (
          <div className="dash-section">
            <div className="dash-section-header">
              <h2 className="dash-section-title">Recent Orders</h2>
              <button className="btn-secondary" onClick={() => navigate('/orders')} style={{ padding: '7px 14px', fontSize: 13 }}>View all</button>
            </div>
            <div className="dash-orders">
              {orders.slice(0, 5).map(o => (
                <div key={o.id} className="dash-order-row">
                  <div className="dash-order-info">
                    <div className="dash-order-title">{o.listing?.title || 'Listing deleted'}</div>
                    <div className="dash-order-meta">#{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="dash-order-amount">${o.amount.toFixed(2)}</div>
                  <div className={`tag ${o.status === 'completed' ? 'tag-green' : o.status === 'pending' ? 'tag-accent' : 'tag-orange'}`}>{o.status}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
