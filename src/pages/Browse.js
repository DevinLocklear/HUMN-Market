import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabase';
import './Browse.css';

const CONDITIONS = ['All', 'Raw', 'PSA 10', 'PSA 9', 'PSA 8', 'PSA 7', 'BGS 10', 'BGS 9.5', 'BGS 9', 'CGC 10', 'CGC 9.5', 'Sealed'];
const SORT_OPTIONS = [
  { label: 'Newest', value: 'created_at:desc' },
  { label: 'Price: Low to High', value: 'price:asc' },
  { label: 'Price: High to Low', value: 'price:desc' },
];

export default function Browse({ session }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [navDropOpen, setNavDropOpen] = useState(false);

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [condition, setCondition] = useState('All');
  const [itemType, setItemType] = useState('all');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [sort, setSort] = useState('created_at:desc');
  const [watchlist, setWatchlist] = useState(new Set());

  const fetchListings = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('listings').select('*, profiles(username, seller_rating, avatar_url)', { count: 'exact' }).eq('status', 'active');
    if (query) q = q.or(`title.ilike.%${query}%,card_name.ilike.%${query}%,set_name.ilike.%${query}%`);
    if (condition !== 'All') q = q.eq('condition', condition);
    if (itemType !== 'all') q = q.eq('item_type', itemType);
    if (priceMin) q = q.gte('price', parseFloat(priceMin));
    if (priceMax) q = q.lte('price', parseFloat(priceMax));
    const [col, dir] = sort.split(':');
    q = q.order(col, { ascending: dir === 'asc' }).limit(48);
    const { data, count } = await q;
    setListings(data || []);
    setTotal(count || 0);
    setLoading(false);
  }, [query, condition, itemType, priceMin, priceMax, sort]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  useEffect(() => {
    if (session) {
      supabase.from('watchlist').select('listing_id').eq('user_id', session.user.id)
        .then(({ data }) => setWatchlist(new Set((data || []).map(w => w.listing_id))));
    }
  }, [session]);

  async function toggleWatchlist(id, e) {
    e.stopPropagation();
    if (!session) { navigate('/auth'); return; }
    if (watchlist.has(id)) {
      await supabase.from('watchlist').delete().eq('user_id', session.user.id).eq('listing_id', id);
      setWatchlist(p => { const n = new Set(p); n.delete(id); return n; });
    } else {
      await supabase.from('watchlist').insert({ user_id: session.user.id, listing_id: id });
      setWatchlist(p => new Set([...p, id]));
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    setSearchParams(query ? { q: query } : {});
  }

  function clearFilters() {
    setQuery(''); setCondition('All'); setItemType('all'); setPriceMin(''); setPriceMax('');
    setSearchParams({});
  }

  return (
    <div className="browse-page">
      {/* Nav */}
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-logo" onClick={() => navigate('/')}>
            <img src="https://i.imgur.com/ywgtHOK.png" alt="HUMN" />
            HUMN <span>Market</span>
          </div>
          <form className="nav-search" onSubmit={handleSearch}>
            <span className="nav-search-icon">🔍</span>
            <input placeholder="Search cards, sets..." value={query} onChange={e => setQuery(e.target.value)} />
          </form>
          <div className="nav-links">
            <a href="/browse">Browse</a>
          </div>
          <div className="nav-actions">
            {session ? (
              <div style={{ position: 'relative' }}>
                <div className="nav-user" onClick={() => setNavDropOpen(o => !o)}>
                  {session.user?.user_metadata?.avatar_url
                    ? <img src={session.user.user_metadata.avatar_url} alt="" className="nav-avatar" />
                    : <div className="nav-avatar-init">{session.user?.email?.[0]?.toUpperCase()}</div>
                  }
                  <span style={{ fontSize: 10 }}>▾</span>
                </div>
                {navDropOpen && (
                  <div className="nav-dropdown">
                    {[['🏠 Dashboard', '/dashboard'], ['💰 Sell', '/sell'], ['📦 Orders', '/orders']].map(([label, path]) => (
                      <div key={path} className="nav-dropdown-item" onClick={() => { navigate(path); setNavDropOpen(false); }}>{label}</div>
                    ))}
                    <div className="nav-dropdown-divider" />
                    <div className="nav-dropdown-item" onClick={async () => { await supabase.auth.signOut(); }}>Sign Out</div>
                  </div>
                )}
              </div>
            ) : (
              <button className="btn-primary" onClick={() => navigate('/auth')} style={{ padding: '8px 16px' }}>Sign in</button>
            )}
          </div>
        </div>
      </nav>

      <div className="browse-layout">
        {/* Filters sidebar */}
        <aside className="browse-sidebar">
          <div className="sidebar-section">
            <div className="sidebar-label">Item Type</div>
            <div className="sidebar-pills">
              {[['all', 'All'], ['card', 'Singles'], ['sealed', 'Sealed']].map(([val, label]) => (
                <button key={val} className={`sidebar-pill ${itemType === val ? 'active' : ''}`} onClick={() => setItemType(val)}>{label}</button>
              ))}
            </div>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-label">Condition</div>
            <select className="field-input" style={{ fontSize: 13 }} value={condition} onChange={e => setCondition(e.target.value)}>
              {CONDITIONS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-label">Price Range</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="field-input" style={{ fontSize: 13 }} type="number" placeholder="Min" value={priceMin} onChange={e => setPriceMin(e.target.value)} />
              <input className="field-input" style={{ fontSize: 13 }} type="number" placeholder="Max" value={priceMax} onChange={e => setPriceMax(e.target.value)} />
            </div>
          </div>

          <button className="btn-secondary" style={{ width: '100%', fontSize: 13 }} onClick={clearFilters}>Clear Filters</button>
        </aside>

        {/* Main content */}
        <main className="browse-main">
          <div className="browse-header">
            <div className="browse-count">{total.toLocaleString()} listings{query ? ` for "${query}"` : ''}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select className="field-input" style={{ fontSize: 13, width: 'auto', padding: '7px 32px 7px 12px' }} value={sort} onChange={e => setSort(e.target.value)}>
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <button className="btn-primary" onClick={() => navigate(session ? '/sell' : '/auth')} style={{ padding: '8px 16px', fontSize: 13, flexShrink: 0 }}>+ Sell</button>
            </div>
          </div>

          {loading ? (
            <div className="browse-loading"><div className="spinner" /></div>
          ) : listings.length === 0 ? (
            <div className="browse-empty">
              <p style={{ fontSize: 32, marginBottom: 12 }}>🔍</p>
              <p style={{ fontWeight: 600 }}>No listings found</p>
              <p style={{ color: 'var(--text-secondary)', marginTop: 4, fontSize: 13 }}>Try different filters or be the first to list</p>
              <button className="btn-primary" onClick={() => navigate(session ? '/sell' : '/auth')} style={{ marginTop: 20 }}>List a Card</button>
            </div>
          ) : (
            <div className="browse-grid">
              {listings.map(listing => (
                <div key={listing.id} className="listing-card" onClick={() => navigate(`/listing/${listing.id}`)}>
                  <div style={{ position: 'relative' }}>
                    {listing.image_url
                      ? <img src={listing.image_url} alt={listing.title} className="listing-card-img" />
                      : <div className="listing-card-img-placeholder">🃏</div>
                    }
                    <button className={`watchlist-heart ${watchlist.has(listing.id) ? 'saved' : ''}`} onClick={e => toggleWatchlist(listing.id, e)}>
                      {watchlist.has(listing.id) ? '♥' : '♡'}
                    </button>
                  </div>
                  <div className="listing-card-body">
                    <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                      <span className={`tag ${listing.condition === 'Raw' ? 'tag-accent' : listing.condition?.startsWith('PSA') ? 'tag-gold' : listing.condition === 'Sealed' ? 'tag-green' : 'tag-accent'}`} style={{ fontSize: 10 }}>
                        {listing.condition}
                      </span>
                      {listing.item_type === 'sealed' && <span className="tag tag-green" style={{ fontSize: 10 }}>SEALED</span>}
                    </div>
                    <div className="listing-card-title">{listing.title}</div>
                    {listing.set_name && <div className="listing-card-set">{listing.set_name}</div>}
                    <div className="listing-card-footer">
                      <div className="listing-card-price">${listing.price.toFixed(2)}</div>
                      <div className="listing-card-seller">{listing.profiles?.username || 'Seller'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
