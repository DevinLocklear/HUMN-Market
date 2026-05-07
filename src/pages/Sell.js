import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import './Sell.css';

const CATEGORIES = ['Scarlet & Violet', 'Sword & Shield', 'Sun & Moon', 'XY', 'Black & White', 'HeartGold & SoulSilver', 'Platinum', 'Diamond & Pearl', 'EX Series', 'E-Card', 'Neo', 'Gym', 'Base Set / Fossil / Jungle', 'Promo', 'Other'];
const CONDITIONS = ['Raw / Ungraded', 'PSA 10', 'PSA 9', 'PSA 8', 'PSA 7', 'PSA 6', 'PSA 5', 'PSA 4', 'PSA 3', 'PSA 2', 'PSA 1', 'BGS 10 (Pristine)', 'BGS 9.5 (Gem Mint)', 'BGS 9', 'BGS 8.5', 'BGS 8', 'CGC 10', 'CGC 9.5', 'CGC 9', 'CGC 8.5', 'CGC 8', 'ACE 10', 'SGC 10', 'Sealed / New'];
const LANGUAGES = ['English', 'Japanese', 'Korean', 'Chinese', 'French', 'German', 'Italian', 'Spanish', 'Portuguese'];
const SHIPPING_CARRIERS = ['USPS First Class', 'USPS Priority Mail', 'USPS Ground Advantage', 'UPS Ground', 'FedEx Ground', 'Other'];
const RETURN_POLICIES = ['No Returns', '30 Day Returns', '60 Day Returns'];

export default function Sell({ session }) {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState([]); // array of {file, preview, uploading}
  const [uploadingImages, setUploadingImages] = useState(false);
  const [activeSection, setActiveSection] = useState('photos');

  const [form, setForm] = useState({
    // Core
    item_type: 'card',
    title: '',
    // Category
    set_name: '',
    // Condition
    condition: 'Raw / Ungraded',
    condition_description: '',
    // Item specifics
    card_name: '',
    card_number: '',
    language: 'English',
    grading_company: '',
    grade: '',
    holo: false,
    first_edition: false,
    // Pricing
    price: '',
    best_offer: false,
    best_offer_min: '',
    quantity: 1,
    // Shipping
    shipping_type: 'flat',
    shipping_cost: '',
    shipping_carrier: 'USPS First Class',
    ships_from: '',
    handling_time: '1',
    // Returns
    returns_policy: 'No Returns',
    // Description
    description: '',
  });

  const f = (key, val) => setForm(prev => ({ ...prev, [key]: val }));
  const titleLen = form.title.length;
  const isGraded = form.condition !== 'Raw / Ungraded' && form.condition !== 'Sealed / New';
  const isSealed = form.item_type === 'sealed';

  function handleImageAdd(e) {
    const files = Array.from(e.target.files);
    const newImages = files.slice(0, 12 - images.length).map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).slice(2),
    }));
    setImages(prev => [...prev, ...newImages]);
  }

  function removeImage(id) {
    setImages(prev => prev.filter(img => img.id !== id));
  }

  function moveImage(id, direction) {
    setImages(prev => {
      const idx = prev.findIndex(img => img.id === id);
      const newArr = [...prev];
      const target = direction === 'left' ? idx - 1 : idx + 1;
      if (target < 0 || target >= newArr.length) return prev;
      [newArr[idx], newArr[target]] = [newArr[target], newArr[idx]];
      return newArr;
    });
  }

  async function uploadImages() {
    const urls = [];
    for (const img of images) {
      const ext = img.file.name.split('.').pop();
      const filename = `${session.user.id}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('listing-images').upload(filename, img.file);
      if (!error) {
        const { data } = supabase.storage.from('listing-images').getPublicUrl(filename);
        urls.push(data.publicUrl);
      }
    }
    return urls;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) { alert('Please add a title'); return; }
    if (!form.price) { alert('Please add a price'); return; }

    setSaving(true);
    setUploadingImages(true);

    try {
      const imageUrls = images.length > 0 ? await uploadImages() : [];
      setUploadingImages(false);

      // Build item specifics as JSON in description
      const specifics = {
        card_name: form.card_name,
        card_number: form.card_number,
        language: form.language,
        holo: form.holo,
        first_edition: form.first_edition,
        grading_company: isGraded ? form.grading_company : null,
        grade: isGraded ? form.grade : null,
        shipping_carrier: form.shipping_carrier,
        shipping_cost: form.shipping_cost,
        shipping_type: form.shipping_type,
        ships_from: form.ships_from,
        handling_time: form.handling_time,
        returns_policy: form.returns_policy,
        best_offer: form.best_offer,
        best_offer_min: form.best_offer_min,
        condition_description: form.condition_description,
      };

      const { data, error } = await supabase.from('listings').insert({
        seller_id: session.user.id,
        title: form.title.trim(),
        card_name: form.card_name || null,
        set_name: form.set_name || null,
        condition: form.condition,
        item_type: form.item_type,
        price: parseFloat(form.price),
        quantity: parseInt(form.quantity) || 1,
        description: form.description ? `${form.description}\n\n${JSON.stringify(specifics)}` : JSON.stringify(specifics),
        image_url: imageUrls[0] || null,
        status: 'active',
      }).select().single();

      if (error) throw error;
      navigate(`/listing/${data.id}`);
    } catch (err) {
      console.error(err);
      alert('Failed to create listing. Please try again.');
    }
    setSaving(false);
    setUploadingImages(false);
  }

  const sections = [
    { id: 'photos', label: 'Photos', icon: '📸' },
    { id: 'details', label: 'Item Details', icon: '🃏' },
    { id: 'specifics', label: 'Item Specifics', icon: '📋' },
    { id: 'pricing', label: 'Pricing', icon: '💰' },
    { id: 'shipping', label: 'Shipping', icon: '📦' },
    { id: 'description', label: 'Description', icon: '📝' },
  ];

  const fee = form.price ? (parseFloat(form.price) * 0.05).toFixed(2) : '0.00';
  const payout = form.price ? (parseFloat(form.price) * 0.95).toFixed(2) : '0.00';

  return (
    <div className="sell-page">
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-logo" onClick={() => navigate('/')}>
            <img src="https://i.imgur.com/ywgtHOK.png" alt="HUMN" />
            HUMN <span>Market</span>
          </div>
          <div className="nav-actions">
            <button className="btn-secondary" onClick={() => navigate('/dashboard')} style={{ padding: '8px 16px', fontSize: 13 }}>← Dashboard</button>
          </div>
        </div>
      </nav>

      <div className="sell-layout">
        <div className="sell-left">
          {/* Page title */}
          <div className="sell-page-header">
            <h1 className="sell-page-title">Create a listing</h1>
            <p className="sell-page-sub">Fill out the details below to list your item for sale.</p>
          </div>

          {/* Item type toggle */}
          <div className="sell-section">
            <div className="sell-section-title">What are you selling?</div>
            <div className="item-type-grid">
              {[['card', '🃏', 'Single Card', 'Raw or graded individual card'], ['sealed', '📦', 'Sealed Product', 'Booster box, ETB, tin, bundle']].map(([val, icon, label, sub]) => (
                <div key={val} className={`item-type-option ${form.item_type === val ? 'active' : ''}`} onClick={() => { f('item_type', val); if (val === 'sealed') f('condition', 'Sealed / New'); }}>
                  <div className="item-type-icon">{icon}</div>
                  <div>
                    <div className="item-type-label">{label}</div>
                    <div className="item-type-sub">{sub}</div>
                  </div>
                  <div className={`item-type-check ${form.item_type === val ? 'checked' : ''}`}>{form.item_type === val ? '✓' : ''}</div>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Photos section */}
            <div className={`sell-section ${activeSection === 'photos' ? 'expanded' : ''}`}>
              <div className="sell-section-header" onClick={() => setActiveSection(activeSection === 'photos' ? '' : 'photos')}>
                <div className="sell-section-header-left">
                  <span className="sell-section-num">📸</span>
                  <div>
                    <div className="sell-section-title">Photos</div>
                    <div className="sell-section-hint">{images.length}/12 photos · First photo is the cover</div>
                  </div>
                </div>
                <span className="sell-section-chevron">{activeSection === 'photos' ? '▲' : '▼'}</span>
              </div>

              {activeSection === 'photos' && (
                <div className="sell-section-body">
                  <div className="photos-grid">
                    {images.map((img, idx) => (
                      <div key={img.id} className={`photo-slot filled ${idx === 0 ? 'cover' : ''}`}>
                        <img src={img.preview} alt="" className="photo-preview" />
                        {idx === 0 && <div className="photo-cover-badge">Cover</div>}
                        <div className="photo-actions">
                          {idx > 0 && <button type="button" className="photo-action-btn" onClick={() => moveImage(img.id, 'left')}>◀</button>}
                          {idx < images.length - 1 && <button type="button" className="photo-action-btn" onClick={() => moveImage(img.id, 'right')}>▶</button>}
                          <button type="button" className="photo-action-btn danger" onClick={() => removeImage(img.id)}>✕</button>
                        </div>
                      </div>
                    ))}
                    {images.length < 12 && (
                      <div className="photo-slot add" onClick={() => document.getElementById('photo-input').click()}>
                        <span className="photo-add-icon">+</span>
                        <span className="photo-add-label">Add photo</span>
                        <input id="photo-input" type="file" accept="image/*" multiple onChange={handleImageAdd} style={{ display: 'none' }} />
                      </div>
                    )}
                  </div>
                  <div className="photo-tips">
                    <span>📌 Tips: Use clear, well-lit photos. White background works best. Include front, back, and any flaws.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Item details */}
            <div className={`sell-section ${activeSection === 'details' ? 'expanded' : ''}`}>
              <div className="sell-section-header" onClick={() => setActiveSection(activeSection === 'details' ? '' : 'details')}>
                <div className="sell-section-header-left">
                  <span className="sell-section-num">🃏</span>
                  <div>
                    <div className="sell-section-title">Item Details</div>
                    <div className="sell-section-hint">{form.title || 'Title, category, condition'}</div>
                  </div>
                </div>
                <span className="sell-section-chevron">{activeSection === 'details' ? '▲' : '▼'}</span>
              </div>

              {activeSection === 'details' && (
                <div className="sell-section-body">
                  {/* Title */}
                  <div className="field">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="field-label">Listing Title *</label>
                      <span style={{ fontSize: 12, color: titleLen > 70 ? 'var(--red)' : 'var(--text-muted)' }}>{titleLen}/80</span>
                    </div>
                    <input
                      className="field-input"
                      maxLength={80}
                      placeholder={isSealed ? 'e.g. Prismatic Evolutions Elite Trainer Box Pokemon Sealed' : 'e.g. Charizard ex Full Art 199/131 Pokemon Prismatic Evolutions PSA 10'}
                      value={form.title}
                      onChange={e => f('title', e.target.value)}
                      required
                    />
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Include card name, set, grade, and condition. More detail = more visibility.</div>
                  </div>

                  {/* Category */}
                  <div className="field">
                    <label className="field-label">Set / Series</label>
                    <select className="field-input" value={form.set_name} onChange={e => f('set_name', e.target.value)}>
                      <option value="">— Select a set —</option>
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>

                  {/* Condition */}
                  <div className="field">
                    <label className="field-label">Condition *</label>
                    {isSealed ? (
                      <div className="condition-sealed-badge">📦 Sealed / New</div>
                    ) : (
                      <select className="field-input" value={form.condition} onChange={e => f('condition', e.target.value)} required>
                        {CONDITIONS.filter(c => c !== 'Sealed / New').map(c => <option key={c}>{c}</option>)}
                      </select>
                    )}
                  </div>

                  {/* Condition description */}
                  {!isSealed && (
                    <div className="field">
                      <label className="field-label">Condition Description <span className="opt-label">optional</span></label>
                      <textarea className="field-input" rows={2} placeholder="Describe any flaws, centering, surface wear, whitening, etc." value={form.condition_description} onChange={e => f('condition_description', e.target.value)} style={{ resize: 'vertical' }} />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Item specifics */}
            <div className={`sell-section ${activeSection === 'specifics' ? 'expanded' : ''}`}>
              <div className="sell-section-header" onClick={() => setActiveSection(activeSection === 'specifics' ? '' : 'specifics')}>
                <div className="sell-section-header-left">
                  <span className="sell-section-num">📋</span>
                  <div>
                    <div className="sell-section-title">Item Specifics</div>
                    <div className="sell-section-hint">Card name, number, language, grade</div>
                  </div>
                </div>
                <span className="sell-section-chevron">{activeSection === 'specifics' ? '▲' : '▼'}</span>
              </div>

              {activeSection === 'specifics' && (
                <div className="sell-section-body">
                  {!isSealed && (
                    <>
                      <div className="specifics-grid">
                        <div className="field">
                          <label className="field-label">Card Name</label>
                          <input className="field-input" placeholder="e.g. Charizard ex" value={form.card_name} onChange={e => f('card_name', e.target.value)} />
                        </div>
                        <div className="field">
                          <label className="field-label">Card Number</label>
                          <input className="field-input" placeholder="e.g. 199/131" value={form.card_number} onChange={e => f('card_number', e.target.value)} />
                        </div>
                        <div className="field">
                          <label className="field-label">Language</label>
                          <select className="field-input" value={form.language} onChange={e => f('language', e.target.value)}>
                            {LANGUAGES.map(l => <option key={l}>{l}</option>)}
                          </select>
                        </div>
                      </div>

                      {isGraded && (
                        <div className="specifics-grid">
                          <div className="field">
                            <label className="field-label">Grading Company</label>
                            <select className="field-input" value={form.grading_company} onChange={e => f('grading_company', e.target.value)}>
                              <option value="">— Select —</option>
                              {['PSA', 'BGS', 'CGC', 'ACE', 'SGC', 'Other'].map(g => <option key={g}>{g}</option>)}
                            </select>
                          </div>
                          <div className="field">
                            <label className="field-label">Grade</label>
                            <input className="field-input" placeholder="e.g. 10" value={form.grade} onChange={e => f('grade', e.target.value)} />
                          </div>
                        </div>
                      )}

                      <div className="checkbox-row">
                        <label className="checkbox-label">
                          <input type="checkbox" checked={form.holo} onChange={e => f('holo', e.target.checked)} />
                          <span>Holo / Foil</span>
                        </label>
                        <label className="checkbox-label">
                          <input type="checkbox" checked={form.first_edition} onChange={e => f('first_edition', e.target.checked)} />
                          <span>1st Edition</span>
                        </label>
                      </div>
                    </>
                  )}

                  {isSealed && (
                    <div className="specifics-grid">
                      <div className="field">
                        <label className="field-label">Product Name</label>
                        <input className="field-input" placeholder="e.g. Elite Trainer Box" value={form.card_name} onChange={e => f('card_name', e.target.value)} />
                      </div>
                      <div className="field">
                        <label className="field-label">Language</label>
                        <select className="field-input" value={form.language} onChange={e => f('language', e.target.value)}>
                          {LANGUAGES.map(l => <option key={l}>{l}</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Pricing */}
            <div className={`sell-section ${activeSection === 'pricing' ? 'expanded' : ''}`}>
              <div className="sell-section-header" onClick={() => setActiveSection(activeSection === 'pricing' ? '' : 'pricing')}>
                <div className="sell-section-header-left">
                  <span className="sell-section-num">💰</span>
                  <div>
                    <div className="sell-section-title">Pricing</div>
                    <div className="sell-section-hint">{form.price ? `$${parseFloat(form.price).toFixed(2)} · You receive $${payout}` : 'Set your price'}</div>
                  </div>
                </div>
                <span className="sell-section-chevron">{activeSection === 'pricing' ? '▲' : '▼'}</span>
              </div>

              {activeSection === 'pricing' && (
                <div className="sell-section-body">
                  <div className="price-format-label">Format: Fixed Price</div>

                  <div className="price-row">
                    <div className="field" style={{ flex: 1 }}>
                      <label className="field-label">Price *</label>
                      <div className="price-input-wrap">
                        <span className="price-dollar">$</span>
                        <input className="field-input price-input" type="number" step="0.01" min="0.01" placeholder="0.00" value={form.price} onChange={e => f('price', e.target.value)} required />
                      </div>
                    </div>
                    <div className="field" style={{ flex: 1 }}>
                      <label className="field-label">Quantity</label>
                      <input className="field-input" type="number" min="1" value={form.quantity} onChange={e => f('quantity', e.target.value)} />
                    </div>
                  </div>

                  {/* Best offer toggle */}
                  <div className="best-offer-row" onClick={() => f('best_offer', !form.best_offer)}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>Allow Best Offer</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Let buyers send you offers below your asking price</div>
                    </div>
                    <div className={`toggle-switch ${form.best_offer ? 'on' : ''}`}><div className="toggle-knob" /></div>
                  </div>

                  {form.best_offer && (
                    <div className="field">
                      <label className="field-label">Minimum Offer <span className="opt-label">optional</span></label>
                      <div className="price-input-wrap">
                        <span className="price-dollar">$</span>
                        <input className="field-input price-input" type="number" step="0.01" placeholder="Auto-decline offers below this" value={form.best_offer_min} onChange={e => f('best_offer_min', e.target.value)} />
                      </div>
                    </div>
                  )}

                  {form.price && (
                    <div className="fee-breakdown">
                      <div className="fee-breakdown-row"><span>Your price</span><span>${parseFloat(form.price).toFixed(2)}</span></div>
                      <div className="fee-breakdown-row red"><span>Platform fee (5%)</span><span>−${fee}</span></div>
                      <div className="fee-breakdown-divider" />
                      <div className="fee-breakdown-row total"><span>You receive</span><span>${payout}</span></div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Shipping */}
            <div className={`sell-section ${activeSection === 'shipping' ? 'expanded' : ''}`}>
              <div className="sell-section-header" onClick={() => setActiveSection(activeSection === 'shipping' ? '' : 'shipping')}>
                <div className="sell-section-header-left">
                  <span className="sell-section-num">📦</span>
                  <div>
                    <div className="sell-section-title">Shipping</div>
                    <div className="sell-section-hint">{form.shipping_cost ? `$${parseFloat(form.shipping_cost).toFixed(2)} · ${form.shipping_carrier}` : 'Set shipping details'}</div>
                  </div>
                </div>
                <span className="sell-section-chevron">{activeSection === 'shipping' ? '▲' : '▼'}</span>
              </div>

              {activeSection === 'shipping' && (
                <div className="sell-section-body">
                  <div className="shipping-type-toggle">
                    {[['flat', 'Flat Rate'], ['free', 'Free Shipping'], ['calculated', 'Calculated']].map(([val, label]) => (
                      <button key={val} type="button" className={`shipping-type-btn ${form.shipping_type === val ? 'active' : ''}`} onClick={() => { f('shipping_type', val); if (val === 'free') f('shipping_cost', '0'); }}>
                        {label}
                      </button>
                    ))}
                  </div>

                  {form.shipping_type !== 'free' && (
                    <div className="field">
                      <label className="field-label">Shipping Cost *</label>
                      <div className="price-input-wrap">
                        <span className="price-dollar">$</span>
                        <input className="field-input price-input" type="number" step="0.01" min="0" placeholder="0.00" value={form.shipping_cost} onChange={e => f('shipping_cost', e.target.value)} />
                      </div>
                    </div>
                  )}

                  <div className="specifics-grid">
                    <div className="field">
                      <label className="field-label">Carrier / Service</label>
                      <select className="field-input" value={form.shipping_carrier} onChange={e => f('shipping_carrier', e.target.value)}>
                        {SHIPPING_CARRIERS.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label className="field-label">Handling Time</label>
                      <select className="field-input" value={form.handling_time} onChange={e => f('handling_time', e.target.value)}>
                        {[['1', 'Ships within 1 day'], ['2', 'Ships within 2 days'], ['3', 'Ships within 3 days'], ['5', 'Ships within 5 days']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label className="field-label">Ships From (ZIP)</label>
                      <input className="field-input" placeholder="e.g. 90210" value={form.ships_from} onChange={e => f('ships_from', e.target.value)} maxLength={10} />
                    </div>
                    <div className="field">
                      <label className="field-label">Returns</label>
                      <select className="field-input" value={form.returns_policy} onChange={e => f('returns_policy', e.target.value)}>
                        {RETURN_POLICIES.map(r => <option key={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div className={`sell-section ${activeSection === 'description' ? 'expanded' : ''}`}>
              <div className="sell-section-header" onClick={() => setActiveSection(activeSection === 'description' ? '' : 'description')}>
                <div className="sell-section-header-left">
                  <span className="sell-section-num">📝</span>
                  <div>
                    <div className="sell-section-title">Description <span className="opt-label">optional</span></div>
                    <div className="sell-section-hint">Additional details for buyers</div>
                  </div>
                </div>
                <span className="sell-section-chevron">{activeSection === 'description' ? '▲' : '▼'}</span>
              </div>

              {activeSection === 'description' && (
                <div className="sell-section-body">
                  <textarea
                    className="field-input"
                    rows={6}
                    placeholder="Describe your item in detail. Include any relevant information buyers should know — pull method, pack fresh, personal collection, etc."
                    value={form.description}
                    onChange={e => f('description', e.target.value)}
                    style={{ resize: 'vertical' }}
                  />
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="sell-submit-bar">
              <button type="button" className="btn-secondary" onClick={() => navigate('/dashboard')}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving} style={{ padding: '12px 32px', fontSize: 15 }}>
                {uploadingImages ? 'Uploading photos...' : saving ? 'Publishing...' : 'Publish Listing'}
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar */}
        <div className="sell-right">
          {/* Preview card */}
          <div className="sell-preview-card">
            <div className="sell-preview-label">Listing Preview</div>
            <div className="sell-preview-img">
              {images.length > 0 ? <img src={images[0].preview} alt="preview" /> : <div className="sell-preview-placeholder">📸</div>}
            </div>
            <div className="sell-preview-title">{form.title || 'Your listing title'}</div>
            {form.set_name && <div className="sell-preview-set">{form.set_name}</div>}
            <div className="sell-preview-meta">
              {form.condition && <span className="tag tag-accent" style={{ fontSize: 11 }}>{form.condition}</span>}
            </div>
            <div className="sell-preview-price">{form.price ? `$${parseFloat(form.price).toFixed(2)}` : '—'}</div>
          </div>

          {/* Checklist */}
          <div className="sell-checklist">
            <div className="sell-checklist-title">Listing checklist</div>
            {[
              { label: 'Photo added', done: images.length > 0 },
              { label: 'Title written', done: form.title.length >= 10 },
              { label: 'Condition set', done: !!form.condition },
              { label: 'Price set', done: !!form.price },
              { label: 'Shipping set', done: !!form.shipping_cost || form.shipping_type === 'free' },
            ].map((item, i) => (
              <div key={i} className={`sell-checklist-item ${item.done ? 'done' : ''}`}>
                <div className={`sell-checklist-dot ${item.done ? 'done' : ''}`}>{item.done ? '✓' : ''}</div>
                {item.label}
              </div>
            ))}
          </div>

          {/* Fee summary */}
          <div className="sell-fee-summary">
            <div className="sell-fee-title">Fee Summary</div>
            <div className="sell-fee-row"><span>Listing fee</span><span className="green">Free</span></div>
            <div className="sell-fee-row"><span>Sale fee</span><span>5%</span></div>
            <div className="sell-fee-row"><span>Payment processing</span><span>Included</span></div>
            {form.price && <>
              <div className="sell-fee-divider" />
              <div className="sell-fee-row bold"><span>You receive</span><span className="green">${payout}</span></div>
            </>}
            <div className="sell-fee-note">vs TCGPlayer's 10.25%+ fees</div>
          </div>
        </div>
      </div>
    </div>
  );
}
