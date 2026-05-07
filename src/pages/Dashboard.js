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
  const [activeTab, setActiveTab] = useState('listings');
  const [navDropOpen, setNavDropOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const uid = session.user.id;
      const [{ data: prof }, { data: lists }, { data: ords }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', uid).single(),
        supabase.from('listings').select('*').eq('seller_id', uid).order('created_at', { ascending: false }),
        supabase.from('orders')
          .select('*, listing:listing_id(title, price, image_url, condition)')
          .or(`buyer_id.eq.${uid},seller_id.eq.${uid}`)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);
      setProfile(prof);
      setListings(lists || []);
      setOrders(ords || []);
      setLoading(false);
    }
    fetchData();
  }, []); // eslint-disable-line

  async function toggleListingStatus(listing) {
    const newStatus = listing.status === 'active' ? 'inactive' : 'active';
    await supabase.from('listings').update({ status: newStatus }).eq('id', listing.id);
    setListings(l => l.map(x => x.id === listing.id ? { ...x, status: newStatus } : x));
  }

  async function deleteListing(id) {
    if (!window.confirm('Delete this listing?')) return;
    await supabase.from('listings').delete().eq('id', id);
    setListings(l => l.filter(x => x.id !== id));
  }

  function timeAgo(date) {
    const s = Math.floor((new Date() - new Date(date)) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  }

  const activeListings = listings.filter(l => l.status === 'active');
  const inactiveListings = listings.filter(l => l.status === 'inactive');
  const soldListings = listings.filter(l => l.status === 'sold');
  const portfolioValue = activeListings.reduce((s, l) => s + l.price, 0);
  const totalEarned = orders.filter(o => o.seller_id === session.user.id && o.status === 'completed').reduce((s, o) => s + (o.seller_payout || 0), 0);
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const recentActivity = orders.slice(0, 8);

  const displayedListings = activeTab === 'listings' ? activeListings
    : activeTab === 'inactive' ? inactiveListings
    : soldListings;

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

  const username = profile?.username || session.user?.user_metadata?.full_name?.split(' ')[0] || session.user?.email?.split('@')[0];
  const avatarUrl = profile?.avatar_url || session.user?.user_metadata?.avatar_url;

  return (
    <div className="dash-page">
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-logo" onClick={() => navigate('/')}>
            <img src="https://i.imgur.com/ywgtHOK.png" alt="HUMN" />
            HUMN <span>Market</span>
          </div>
          <div className="nav-links">
            <a href="/browse">Browse</a>
            <a href="/sell">Sell</a>
            <a href="/orders">Orders</a>
          </div>
          <div className="nav-actions">
            <button className="btn-primary" onClick={() => navigate('/sell')} style={{ padding: '8px 16px', fontSize: 13 }}>+ New Listing</button>
            <div style={{ position: 'relative' }}>
              <div className="nav-user" onClick={() => setNavDropOpen(o => !o)}>
                {avatarUrl ? <img src={avatarUrl} alt="" className="nav-avatar" /> : <div className="nav-avatar-init">{username?.[0]?.toUpperCase()}</div>}
                <span>{username}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>▾</span>
              </div>
              {navDropOpen && (
                <div className="nav-dropdown">
                  <div className="nav-dropdown-email">{session.user?.email}</div>
                  {[['🏠 Dashboard', '/dashboard'], ['🛍️ Browse', '/browse'], ['💰 Sell', '/sell'], ['📦 Orders', '/orders'], ['👤 Profile', `/profile/${session.user.id}`]].map(([label, path]) => (
                    <div key={path} className="nav-dropdown-item" onClick={() => { navigate(path); setNavDropOpen(false); }}>{label}</div>
                  ))}
                  <div className="nav-dropdown-divider" />
                  <div className="nav-dropdown-item" onClick={async () => { await supabase.auth.signOut(); navigate('/'); }}>Sign Out</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="dash-layout">
        {/* Left sidebar */}
        <aside className="dash-sidebar">
          <div className="dash-profile-card">
            <div className="dash-profile-avatar-wrap">
              {avatarUrl ? <img src={avatarUrl} alt="" className="dash-profile-avatar" /> : <div className="dash-profile-avatar-init">{username?.[0]?.toUpperCase()}</div>}
              {(profile?.sales_completed || 0) >= 5 && <div className="dash-verified-dot">✓</div>}
            </div>
            <div className="dash-profile-name">{username}</div>
            <div className="dash-profile-since">Since {new Date(session.user?.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>
            {(profile?.seller_rating || 0) > 0 && (
              <div className="dash-profile-rating">
                {'★'.repeat(Math.round(profile.seller_rating))}{'☆'.repeat(5 - Math.round(profile.seller_rating))}
                <span>{profile.seller_rating.toFixed(1)}</span>
              </div>
            )}
            <button className="btn-secondary" onClick={() => navigate(`/profile/${session.user.id}`)} style={{ width: '100%', fontSize: 13, marginTop: 12 }}>View Profile</button>
          </div>

          <nav className="dash-sidenav">
            {[
              { icon: '▣', label: 'My Listings', path: '/dashboard' },
              { icon: '📦', label: 'Orders', path: '/orders', badge: pendingOrders.length },
              { icon: '🛍️', label: 'Browse Market', path: '/browse' },
              { icon: '💰', label: 'Create Listing', path: '/sell' },
            ].map((item, i) => (
              <div key={i} className={`dash-sidenav-item ${item.path === '/dashboard' ? 'active' : ''}`} onClick={() => navigate(item.path)}>
                <span className="dash-sidenav-icon">{item.icon}</span>
                <span>{item.label}</span>
                {item.badge > 0 && <span className="dash-nav-badge">{item.badge}</span>}
              </div>
            ))}
          </nav>

          <div className="dash-quick-stats">
            <div className="dash-quick-stat"><div className="dash-quick-stat-val">{activeListings.length}</div><div className="dash-quick-stat-label">Active</div></div>
            <div className="dash-quick-stat"><div className="dash-quick-stat-val">{soldListings.length}</div><div className="dash-quick-stat-label">Sold</div></div>
            <div className="dash-quick-stat"><div className="dash-quick-stat-val">{profile?.sales_completed || 0}</div><div className="dash-quick-stat-label">Trades</div></div>
          </div>
        </aside>

        {/* Main */}
        <main className="dash-main">
          <div className="dash-stats-banner">
            {[
              { label: 'Portfolio Value', val: `$${portfolioValue.toFixed(2)}`, sub: `${activeListings.length} active listings`, color: '' },
              { label: 'Total Earned', val: `$${totalEarned.toFixed(2)}`, sub: `${soldListings.length} sales`, color: 'green' },
              { label: 'Pending Orders', val: pendingOrders.length, sub: 'need attention', color: 'accent' },
              { label: 'Seller Rating', val: (profile?.seller_rating || 0) > 0 ? `${profile.seller_rating.toFixed(1)} ★` : '—', sub: `${profile?.sales_completed || 0} completed`, color: '' },
            ].map((s, i) => (
              <React.Fragment key={s.label}>
                {i > 0 && <div className="dash-stats-divider" />}
                <div className="dash-stat-big">
                  <div className="dash-stat-big-label">{s.label}</div>
                  <div className={`dash-stat-big-val ${s.color}`}>{s.val}</div>
                  <div className="dash-stat-big-sub">{s.sub}</div>
                </div>
              </React.Fragment>
            ))}
          </div>

          {pendingOrders.length > 0 && (
            <div className="dash-alert" onClick={() => navigate('/orders')}>
              <span className="dash-alert-dot" />
              <span>{pendingOrders.length} order{pendingOrders.length > 1 ? 's' : ''} waiting — add tracking to get paid</span>
              <span className="dash-alert-arrow">→</span>
            </div>
          )}

          <div className="dash-content-header">
            <div className="dash-content-tabs">
              {[['listings', 'Active', activeListings.length], ['inactive', 'Paused', inactiveListings.length], ['sold', 'Sold', soldListings.length]].map(([tab, label, count]) => (
                <button key={tab} className={`dash-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                  {label} <span className="dash-tab-count">{count}</span>
                </button>
              ))}
            </div>
            <button className="btn-primary" onClick={() => navigate('/sell')} style={{ padding: '8px 16px', fontSize: 13 }}>+ List a Card</button>
          </div>

          {displayedListings.length === 0 ? (
            <div className="dash-empty-state">
              <div className="dash-empty-icon">🃏</div>
              <div className="dash-empty-title">{activeTab === 'listings' ? 'No active listings' : activeTab === 'sold' ? 'Nothing sold yet' : 'No paused listings'}</div>
              <div className="dash-empty-sub">{activeTab === 'listings' ? 'List your first card and start selling today' : activeTab === 'sold' ? 'Complete your first sale to see it here' : 'Paused listings will appear here'}</div>
              {activeTab === 'listings' && <button className="btn-primary" onClick={() => navigate('/sell')} style={{ marginTop: 16 }}>Create Listing</button>}
            </div>
          ) : (
            <div className="dash-cards-grid">
              {displayedListings.map(listing => (
                <div key={listing.id} className="dash-card">
                  <div className="dash-card-img-wrap" onClick={() => navigate(`/listing/${listing.id}`)}>
                    {listing.image_url ? <img src={listing.image_url} alt={listing.title} className="dash-card-img" /> : <div className="dash-card-img-placeholder">🃏</div>}
                    <div className={`dash-card-status-dot ${listing.status}`} />
                    <div className="dash-card-condition-badge">{listing.condition}</div>
                  </div>
                  <div className="dash-card-body">
                    <div className="dash-card-title" onClick={() => navigate(`/listing/${listing.id}`)}>{listing.title}</div>
                    {listing.set_name && <div className="dash-card-set">{listing.set_name}</div>}
                    <div className="dash-card-footer">
                      <div className="dash-card-price">${listing.price.toFixed(2)}</div>
                      {listing.status !== 'sold' && (
                        <div className="dash-card-actions">
                          <button className="dash-card-btn" onClick={() => toggleListingStatus(listing)}>{listing.status === 'active' ? 'Pause' : 'Activate'}</button>
                          <button className="dash-card-btn danger" onClick={() => deleteListing(listing.id)}>×</button>
                        </div>
                      )}
                      {listing.status === 'sold' && <div className="dash-card-sold-badge">SOLD</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Right: activity */}
        <aside className="dash-activity">
          <div className="dash-activity-header">Activity</div>
          {recentActivity.length === 0 ? (
            <div className="dash-activity-empty">No activity yet</div>
          ) : (
            <div className="dash-activity-feed">
              {recentActivity.map(item => {
                const isSale = item.seller_id === session.user.id;
                return (
                  <div key={item.id} className="dash-activity-item">
                    <div className={`dash-activity-icon ${isSale ? 'sale' : 'purchase'}`}>{isSale ? '💰' : '🛍️'}</div>
                    <div className="dash-activity-info">
                      <div className="dash-activity-title">{item.listing?.title || 'Order'}</div>
                      <div className="dash-activity-meta">{isSale ? 'Sale' : 'Purchase'} · {timeAgo(item.created_at)}</div>
                    </div>
                    <div className={`dash-activity-amount ${isSale ? 'green' : ''}`}>
                      {isSale ? '+' : ''}${item.amount.toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <button className="btn-secondary" onClick={() => navigate('/orders')} style={{ width: '100%', fontSize: 13, marginTop: 16 }}>All Orders →</button>
        </aside>
      </div>
    </div>
  );
}
