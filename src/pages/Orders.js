// Orders.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

export default function Orders({ session }) {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState('buying');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('orders')
      .select('*, listing:listing_id(title, price, image_url), buyer:buyer_id(username), seller:seller_id(username)')
      .or(`buyer_id.eq.${session.user.id},seller_id.eq.${session.user.id}`)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setOrders(data || []); setLoading(false); });
  }, []); // eslint-disable-line

  async function submitTracking(orderId, tracking) {
    await supabase.from('orders').update({ tracking_number: tracking, shipped_at: new Date().toISOString() }).eq('id', orderId);
    setOrders(o => o.map(x => x.id === orderId ? { ...x, tracking_number: tracking } : x));
  }

  async function confirmDelivery(orderId) {
    await supabase.from('orders').update({ status: 'completed', delivered_at: new Date().toISOString() }).eq('id', orderId);
    setOrders(o => o.map(x => x.id === orderId ? { ...x, status: 'completed' } : x));
  }

  const buying = orders.filter(o => o.buyer_id === session.user.id);
  const selling = orders.filter(o => o.seller_id === session.user.id);
  const displayed = tab === 'buying' ? buying : selling;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)' }}>
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-logo" onClick={() => navigate('/')}><img src="https://i.imgur.com/ywgtHOK.png" alt="HUMN" />HUMN <span>Market</span></div>
          <div className="nav-actions">
            <button className="btn-secondary" onClick={() => navigate('/dashboard')} style={{ padding: '8px 16px', fontSize: 13 }}>Dashboard</button>
          </div>
        </div>
      </nav>
      <div className="page-wrapper">
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 24 }}>Orders</h1>
        <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
          {[['buying', `Buying (${buying.length})`], ['selling', `Selling (${selling.length})`]].map(([val, label]) => (
            <button key={val} onClick={() => setTab(val)} style={{ background: 'none', border: 'none', borderBottom: `2px solid ${tab === val ? 'var(--accent)' : 'transparent'}`, color: tab === val ? 'var(--accent)' : 'var(--text-secondary)', padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: -1, fontFamily: 'inherit' }}>{label}</button>
          ))}
        </div>
        {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div> : displayed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 32px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16, color: 'var(--text-secondary)' }}>No {tab} orders yet</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {displayed.map(order => (
              <OrderCard key={order.id} order={order} tab={tab} session={session} onTracking={submitTracking} onConfirm={confirmDelivery} navigate={navigate} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OrderCard({ order, tab, session, onTracking, onConfirm, navigate }) {
  const [trackingInput, setTrackingInput] = useState('');
  const [showTracking, setShowTracking] = useState(false);
  const statusColor = order.status === 'completed' ? 'tag-green' : order.status === 'shipped' ? 'tag-accent' : 'tag-orange';

  return (
    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px', display: 'flex', gap: 20, alignItems: 'flex-start', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ width: 56, height: 56, borderRadius: 10, overflow: 'hidden', background: 'var(--bg-secondary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0, cursor: 'pointer' }} onClick={() => navigate(`/listing/${order.listing_id}`)}>
        {order.listing?.image_url ? <img src={order.listing.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🃏'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{order.listing?.title || 'Listing deleted'}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: 12 }}>Order #{order.id.slice(0, 8)} · {new Date(order.created_at).toLocaleDateString()}</div>
        {order.tracking_number && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>📦 Tracking: <span style={{ fontFamily: 'monospace', color: 'var(--text)' }}>{order.tracking_number}</span></div>}
        {tab === 'selling' && order.status === 'pending' && !order.tracking_number && (
          showTracking ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input className="field-input" style={{ fontSize: 13, flex: 1 }} placeholder="Enter tracking number" value={trackingInput} onChange={e => setTrackingInput(e.target.value)} />
              <button className="btn-primary" style={{ padding: '8px 14px', fontSize: 13 }} onClick={() => { onTracking(order.id, trackingInput); setShowTracking(false); }}>Submit</button>
            </div>
          ) : (
            <button className="btn-primary" style={{ padding: '8px 16px', fontSize: 13, marginTop: 8 }} onClick={() => setShowTracking(true)}>Add Tracking →</button>
          )
        )}
        {tab === 'buying' && order.status === 'shipped' && (
          <button className="btn-primary" style={{ padding: '8px 16px', fontSize: 13, background: 'var(--green)', marginTop: 8 }} onClick={() => onConfirm(order.id)}>Confirm Receipt</button>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>${order.amount.toFixed(2)}</div>
        <div className={`tag ${statusColor}`}>{order.status}</div>
        {tab === 'selling' && order.status === 'completed' && <div style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>+${order.seller_payout.toFixed(2)}</div>}
      </div>
    </div>
  );
}
