import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import './Sell.css';

const CONDITIONS = ['Raw', 'PSA 10', 'PSA 9', 'PSA 8', 'PSA 7', 'BGS 10', 'BGS 9.5', 'BGS 9', 'CGC 10', 'CGC 9.5', 'Sealed'];

export default function Sell({ session }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [form, setForm] = useState({
    item_type: 'card',
    title: '',
    card_name: '',
    set_name: '',
    condition: 'Raw',
    price: '',
    quantity: 1,
    description: '',
    image_url: '',
  });

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function uploadImage() {
    if (!imageFile) return null;
    setUploadingImage(true);
    try {
      const ext = imageFile.name.split('.').pop();
      const filename = `${session.user.id}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('listing-images').upload(filename, imageFile);
      if (error) throw error;
      const { data } = supabase.storage.from('listing-images').getPublicUrl(filename);
      return data.publicUrl;
    } catch (e) {
      console.error('Image upload failed:', e);
      return null;
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      let imageUrl = form.image_url;
      if (imageFile) {
        const uploaded = await uploadImage();
        if (uploaded) imageUrl = uploaded;
      }

      const { data, error } = await supabase.from('listings').insert({
        seller_id: session.user.id,
        title: form.title,
        card_name: form.card_name || null,
        set_name: form.set_name || null,
        condition: form.condition,
        item_type: form.item_type,
        price: parseFloat(form.price),
        quantity: parseInt(form.quantity) || 1,
        description: form.description || null,
        image_url: imageUrl || null,
        status: 'active',
      }).select().single();

      if (error) throw error;
      navigate(`/listing/${data.id}`);
    } catch (e) {
      alert('Failed to create listing. Please try again.');
    }
    setSaving(false);
  }

  const fee = form.price ? (parseFloat(form.price) * 0.05).toFixed(2) : '0.00';
  const payout = form.price ? (parseFloat(form.price) * 0.95).toFixed(2) : '0.00';

  return (
    <div className="sell-page">
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-logo" onClick={() => navigate('/')}><img src="https://i.imgur.com/ywgtHOK.png" alt="HUMN" />HUMN <span>Market</span></div>
          <div className="nav-actions">
            <button className="btn-secondary" onClick={() => navigate('/dashboard')} style={{ padding: '8px 16px', fontSize: 13 }}>Dashboard</button>
          </div>
        </div>
      </nav>

      <div className="sell-layout">
        <div className="sell-main">
          <h1 className="sell-title">Create a listing</h1>
          <p className="sell-sub">List your card or sealed product for sale. Just 5% fee when it sells.</p>

          <form onSubmit={handleSubmit} className="sell-form">
            {/* Item type */}
            <div className="sell-section">
              <div className="sell-section-label">Item type</div>
              <div className="type-toggle">
                <button type="button" className={`type-btn ${form.item_type === 'card' ? 'active' : ''}`} onClick={() => setForm(f => ({ ...f, item_type: 'card', condition: 'Raw' }))}>
                  🃏 Single Card
                </button>
                <button type="button" className={`type-btn ${form.item_type === 'sealed' ? 'active' : ''}`} onClick={() => setForm(f => ({ ...f, item_type: 'sealed', condition: 'Sealed' }))}>
                  📦 Sealed Product
                </button>
              </div>
            </div>

            {/* Image upload */}
            <div className="sell-section">
              <div className="sell-section-label">Photo</div>
              <div className="image-upload-area" onClick={() => document.getElementById('img-input').click()}>
                {imagePreview ? (
                  <img src={imagePreview} alt="preview" className="image-preview" />
                ) : (
                  <div className="image-upload-placeholder">
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📸</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>Click to upload photo</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>JPG, PNG up to 5MB</div>
                  </div>
                )}
                <input id="img-input" type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
              </div>
              {imagePreview && (
                <button type="button" className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px', marginTop: 8 }} onClick={() => { setImageFile(null); setImagePreview(null); }}>
                  Remove photo
                </button>
              )}
            </div>

            {/* Details */}
            <div className="sell-section">
              <div className="sell-section-label">Listing details</div>
              <div className="field">
                <label className="field-label">Listing title *</label>
                <input className="field-input" placeholder={form.item_type === 'card' ? 'e.g. Charizard ex Full Art - Prismatic Evolutions' : 'e.g. Prismatic Evolutions Elite Trainer Box'} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div className="form-row" style={{ marginTop: 12 }}>
                {form.item_type === 'card' && (
                  <div className="field">
                    <label className="field-label">Card name</label>
                    <input className="field-input" placeholder="e.g. Charizard ex" value={form.card_name} onChange={e => setForm(f => ({ ...f, card_name: e.target.value }))} />
                  </div>
                )}
                <div className="field">
                  <label className="field-label">Set / Series</label>
                  <input className="field-input" placeholder="e.g. Prismatic Evolutions" value={form.set_name} onChange={e => setForm(f => ({ ...f, set_name: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Condition + Price */}
            <div className="sell-section">
              <div className="sell-section-label">Condition & pricing</div>
              <div className="form-row">
                <div className="field">
                  <label className="field-label">Condition *</label>
                  <select className="field-input" value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}>
                    {form.item_type === 'sealed' ? <option>Sealed</option> : CONDITIONS.filter(c => c !== 'Sealed').map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="field-label">Price ($) *</label>
                  <input className="field-input" type="number" step="0.01" min="1" placeholder="0.00" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required />
                </div>
              </div>
              <div className="field" style={{ marginTop: 12 }}>
                <label className="field-label">Quantity</label>
                <input className="field-input" type="number" min="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} style={{ maxWidth: 120 }} />
              </div>
            </div>

            {/* Description */}
            <div className="sell-section">
              <div className="sell-section-label">Description <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none', fontSize: 12 }}>optional</span></div>
              <textarea className="field-input" rows={4} placeholder="Describe the card's condition, any flaws, centering, etc." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ resize: 'vertical' }} />
            </div>

            <button type="submit" className="btn-primary" disabled={saving || uploadingImage} style={{ width: '100%', padding: '14px', fontSize: 15 }}>
              {saving || uploadingImage ? 'Publishing...' : 'Publish Listing'}
            </button>
          </form>
        </div>

        {/* Preview / fee breakdown */}
        <div className="sell-sidebar">
          <div className="fee-card">
            <div className="fee-card-title">Fee breakdown</div>
            <div className="fee-row">
              <span>Listing price</span>
              <span>${form.price || '0.00'}</span>
            </div>
            <div className="fee-row red">
              <span>Platform fee (5%)</span>
              <span>-${fee}</span>
            </div>
            <div className="fee-divider" />
            <div className="fee-row total">
              <span>You receive</span>
              <span>${payout}</span>
            </div>
            <div className="fee-note">Payment sent directly to your bank via Stripe Connect after buyer confirms receipt.</div>
          </div>

          <div className="tips-card">
            <div className="tips-title">Tips for faster sales</div>
            <div className="tip-item">📸 Clear photo on white background</div>
            <div className="tip-item">💰 Price within 10% of market value</div>
            <div className="tip-item">📝 Include condition details in description</div>
            <div className="tip-item">📦 Ship within 3 days of purchase</div>
          </div>
        </div>
      </div>
    </div>
  );
}
