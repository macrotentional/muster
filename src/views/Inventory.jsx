import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const CATALOG = {
  'Footwear': {
    items: ['Bowling Shoe', 'Ice Skate', 'Roller Skate', 'Ski Boot', 'Cycling Shoe'],
    sizes: ['4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14'],
  },
  'Rackets & Paddles': {
    items: ['Tennis Racket', 'Badminton Racket', 'Squash Racket', 'Pickleball Paddle', 'Table Tennis Paddle'],
    sizes: ['Junior', 'Standard', 'Oversize'],
  },
  'Mats': {
    items: ['Yoga Mat', 'Exercise Mat', 'Gymnastics Mat', 'Wrestling Mat'],
    sizes: ['Standard', 'Wide', 'XL'],
  },
  'Protective Gear': {
    items: ['Helmet', 'Life Jacket', 'Knee Pad', 'Elbow Pad', 'Shin Guard', 'Wrist Guard'],
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  },
  'Tech': {
    items: ['Laptop', 'Tablet', 'Webcam', 'Keyboard', 'Mouse', 'Monitor', 'Headset', 'USB Hub', 'Projector', 'HDMI Cable'],
    sizes: ['N/A'],
  },
  'Other': {
    items: [],
    sizes: [],
  },
}

const CATEGORIES = Object.keys(CATALOG)

function nextAssetTag(category, items) {
  const prefix = category.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X')
  const existing = items
    .filter(i => i.asset_tag && i.asset_tag.startsWith(prefix + '-'))
    .map(i => parseInt(i.asset_tag.split('-')[1]) || 0)
  const next = existing.length > 0 ? Math.max(...existing) + 1 : 1
  return `${prefix}-${String(next).padStart(3, '0')}`
}

const BLANK = { category: '', name: '', size: '', quantity: 1, storage_location: '', notes: '' }

export default function Inventory() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [conditionFilter, setConditionFilter] = useState('all')
  const [search, setSearch] = useState('')

  async function fetchItems() {
    const { data, err } = await supabase.from('items').select('*').order('name')
    if (!err) setItems(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchItems() }, [])

  const catalogItems = form.category ? CATALOG[form.category]?.items || [] : []
  const catalogSizes = form.category ? CATALOG[form.category]?.sizes || [] : []

  function setField(field, value) {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'category') { next.name = ''; next.size = '' }
      return next
    })
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.category || !form.name) return
    setSubmitting(true)
    setError(null)

    const qty = Math.max(1, parseInt(form.quantity) || 1)
    const toInsert = []
    for (let i = 0; i < qty; i++) {
      toInsert.push({
        name: form.name,
        category: form.category,
        size: form.size || null,
        asset_tag: nextAssetTag(form.category, [...items, ...toInsert]),
        storage_location: form.storage_location.trim() || null,
        notes: form.notes.trim() || null,
      })
    }

    const { error: err } = await supabase.from('items').insert(toInsert)

    if (err) {
      setError(err.message)
    } else {
      setForm(BLANK)
      setShowForm(false)
      fetchItems()
    }
    setSubmitting(false)
  }

  const filtered = items.filter(item => {
    if (conditionFilter !== 'all' && item.condition !== conditionFilter) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      item.name.toLowerCase().includes(q) ||
      (item.category || '').toLowerCase().includes(q) ||
      (item.size || '').toLowerCase().includes(q) ||
      (item.asset_tag || '').toLowerCase().includes(q)
    )
  })

  if (loading) return <div className="loading">Loading...</div>

  return (
    <div className="view">
      <div className="toolbar">
        <div className="toolbar-left">
          <input
            className="search"
            type="search"
            placeholder="Search inventory..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="select" value={conditionFilter} onChange={e => setConditionFilter(e.target.value)}>
            <option value="all">All conditions</option>
            <option value="good">Good</option>
            <option value="damaged">Damaged</option>
            <option value="retired">Retired / lost</option>
          </select>
        </div>
        <button className="btn primary" onClick={() => { setShowForm(v => !v); setError(null) }}>
          {showForm ? 'Cancel' : '+ Add Item'}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h3>Add Item</h3>
          {error && <div className="form-error">{error}</div>}
          <form onSubmit={handleAdd} className="add-item-form">
            <div className="field">
              <label>Category *</label>
              <select className="select" value={form.category} onChange={e => setField('category', e.target.value)} required>
                <option value="">Select category</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="field">
              <label>Item *</label>
              {catalogItems.length > 0 ? (
                <select className="select" value={form.name} onChange={e => setField('name', e.target.value)} required disabled={!form.category}>
                  <option value="">Select item</option>
                  {catalogItems.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              ) : (
                <input type="text" value={form.name} onChange={e => setField('name', e.target.value)} placeholder="Item name" disabled={!form.category} />
              )}
            </div>

            {catalogSizes.length > 0 && catalogSizes[0] !== 'N/A' && (
              <div className="field">
                <label>Size</label>
                <select className="select" value={form.size} onChange={e => setField('size', e.target.value)}>
                  <option value="">No size</option>
                  {catalogSizes.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}

            <div className="field">
              <label>Quantity</label>
              <input
                type="number"
                className="qty-input"
                value={form.quantity}
                min={1}
                max={50}
                onChange={e => setField('quantity', e.target.value)}
              />
            </div>

            <div className="field">
              <label>Location</label>
              <input type="text" value={form.storage_location} onChange={e => setField('storage_location', e.target.value)} placeholder="e.g. Back room shelf B" />
            </div>

            <div className="field form-actions">
              <button type="submit" className="btn primary" disabled={!form.category || !form.name || submitting}>
                {submitting ? 'Adding...' : `Add${form.quantity > 1 ? ` ${form.quantity}` : ''}`}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="inventory-count">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</div>

      <table className="table">
        <thead>
          <tr>
            <th>Tag</th>
            <th>Name</th>
            <th>Category</th>
            <th>Size</th>
            <th>Condition</th>
            <th>Location</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(item => (
            <tr key={item.id}>
              <td className="mono muted">{item.asset_tag || '—'}</td>
              <td>{item.name}</td>
              <td className="muted">{item.category || '—'}</td>
              <td className="muted">{item.size || '—'}</td>
              <td>
                <span className={`badge ${
                  item.condition === 'good' ? 'success' :
                  item.condition === 'damaged' ? 'danger' : 'muted'
                }`}>
                  {item.condition.charAt(0).toUpperCase() + item.condition.slice(1)}
                </span>
              </td>
              <td className="muted">{item.storage_location || '—'}</td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr><td colSpan={6} className="empty">No items found</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
