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

const BLANK      = { category: '', name: '', size: '', quantity: 1, storage_location: '', notes: '' }
const BLANK_EDIT = { size: '', condition: 'good', storage_location: '', notes: '' }
const BLANK_BULK = { condition: '', storage_location: '', notes: '' }

export default function Inventory() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [conditionFilter, setConditionFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(BLANK_EDIT)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  // Multi-select
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [lastSelectedIdx, setLastSelectedIdx] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragAnchorIdx, setDragAnchorIdx] = useState(null)
  const [bulkEditMode, setBulkEditMode] = useState(false)
  const [bulkForm, setBulkForm] = useState(BLANK_BULK)
  const [bulkConfirmDelete, setBulkConfirmDelete] = useState(false)
  const [bulkSaving, setBulkSaving] = useState(false)

  async function fetchItems() {
    const { data, err } = await supabase.from('items').select('*').order('name')
    if (!err) setItems(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchItems() }, [])

  useEffect(() => {
    const onUp = () => setIsDragging(false)
    document.addEventListener('mouseup', onUp)
    return () => document.removeEventListener('mouseup', onUp)
  }, [])

  const catalogItems  = form.category ? CATALOG[form.category]?.items || [] : []
  const catalogSizes  = form.category ? CATALOG[form.category]?.sizes || [] : []
  const editCatalogSizes = editingId
    ? CATALOG[items.find(i => i.id === editingId)?.category]?.sizes || []
    : []

  function setField(field, value) {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'category') { next.name = ''; next.size = '' }
      return next
    })
  }

  function startEdit(item) {
    setEditingId(item.id)
    setEditForm({
      size: item.size || '',
      condition: item.condition || 'good',
      storage_location: item.storage_location || '',
      notes: item.notes || '',
    })
    setShowForm(false)
    setConfirmDelete(null)
    setBulkEditMode(false)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm(BLANK_EDIT)
  }

  async function handleEdit(e) {
    e.preventDefault()
    setSaving(true)
    const { error: err } = await supabase
      .from('items')
      .update({
        size: editForm.size || null,
        condition: editForm.condition,
        storage_location: editForm.storage_location.trim() || null,
        notes: editForm.notes.trim() || null,
      })
      .eq('id', editingId)
    if (!err) { setEditingId(null); fetchItems() }
    setSaving(false)
  }

  async function handleDelete(id) {
    const { error: err } = await supabase.from('items').delete().eq('id', id)
    if (!err) { setConfirmDelete(null); fetchItems() }
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

  // ── Multi-select handlers ────────────────────────────

  function handleRowMouseDown(e, idx) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    setIsDragging(true)
    setDragAnchorIdx(idx)
    setSelectedIds(new Set([filtered[idx].id]))
    setLastSelectedIdx(idx)
    e.preventDefault()
  }

  function handleRowMouseEnter(idx) {
    if (!isDragging) return
    const start = Math.min(dragAnchorIdx, idx)
    const end   = Math.max(dragAnchorIdx, idx)
    setSelectedIds(new Set(filtered.slice(start, end + 1).map(i => i.id)))
  }

  function handleRowClick(e, idx) {
    const id = filtered[idx].id
    if (e.metaKey || e.ctrlKey) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id); else next.add(id)
        return next
      })
      setLastSelectedIdx(idx)
    } else if (e.shiftKey && lastSelectedIdx !== null) {
      const start = Math.min(lastSelectedIdx, idx)
      const end   = Math.max(lastSelectedIdx, idx)
      setSelectedIds(new Set(filtered.slice(start, end + 1).map(i => i.id)))
    } else {
      setSelectedIds(new Set())
      setLastSelectedIdx(null)
    }
  }

  async function handleBulkEdit(e) {
    e.preventDefault()
    setBulkSaving(true)
    const updates = {}
    if (bulkForm.condition)                   updates.condition        = bulkForm.condition
    if (bulkForm.storage_location.trim())     updates.storage_location = bulkForm.storage_location.trim()
    if (bulkForm.notes.trim())                updates.notes            = bulkForm.notes.trim()
    if (Object.keys(updates).length > 0) {
      await supabase.from('items').update(updates).in('id', [...selectedIds])
    }
    setBulkEditMode(false)
    setBulkForm(BLANK_BULK)
    setSelectedIds(new Set())
    fetchItems()
    setBulkSaving(false)
  }

  async function handleBulkDelete() {
    await supabase.from('items').delete().in('id', [...selectedIds])
    setBulkConfirmDelete(false)
    setSelectedIds(new Set())
    fetchItems()
  }

  // ────────────────────────────────────────────────────

  const filtered = items.filter(item => {
    if (conditionFilter !== 'all' && item.condition !== conditionFilter) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      item.name.toLowerCase().includes(q) ||
      (item.category || '').toLowerCase().includes(q) ||
      (item.size     || '').toLowerCase().includes(q) ||
      (item.asset_tag || '').toLowerCase().includes(q)
    )
  })

  if (loading) return <div className="loading">Loading...</div>

  const editingItem = items.find(i => i.id === editingId)

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
            <option value="retired">Lost/unknown</option>
          </select>
        </div>
        <button className="btn primary" onClick={() => { setShowForm(v => !v); setError(null); cancelEdit(); setBulkEditMode(false) }}>
          {showForm ? 'Cancel' : '+ Add gear'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card">
          <h3>Add gear</h3>
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
              <input type="number" className="qty-input" value={form.quantity} min={1} max={50} onChange={e => setField('quantity', e.target.value)} />
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

      {/* Single edit form */}
      {editingItem && (
        <div className="card">
          <h3>Edit — {editingItem.asset_tag && <span className="mono muted">{editingItem.asset_tag} </span>}{editingItem.name}</h3>
          <form onSubmit={handleEdit} className="add-item-form">
            {editCatalogSizes.length > 0 && editCatalogSizes[0] !== 'N/A' && (
              <div className="field">
                <label>Size</label>
                <select className="select" value={editForm.size} onChange={e => setEditForm(f => ({ ...f, size: e.target.value }))}>
                  <option value="">No size</option>
                  {editCatalogSizes.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
            <div className="field">
              <label>Condition</label>
              <select className="select" value={editForm.condition} onChange={e => setEditForm(f => ({ ...f, condition: e.target.value }))}>
                <option value="good">Good</option>
                <option value="damaged">Damaged</option>
                <option value="retired">Lost/unknown</option>
              </select>
            </div>
            <div className="field">
              <label>Location</label>
              <input type="text" value={editForm.storage_location} onChange={e => setEditForm(f => ({ ...f, storage_location: e.target.value }))} placeholder="e.g. Back room shelf B" />
            </div>
            <div className="field">
              <label>Notes</label>
              <input type="text" value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any notes" />
            </div>
            <div className="field form-actions">
              <button type="submit" className="btn primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              <button type="button" className="btn" onClick={cancelEdit}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Bulk edit form */}
      {bulkEditMode && (
        <div className="card">
          <h3>Edit {selectedIds.size} items</h3>
          <p className="form-hint">Only filled fields will be updated. Leave blank to keep existing values.</p>
          <form onSubmit={handleBulkEdit} className="add-item-form">
            <div className="field">
              <label>Condition</label>
              <select className="select" value={bulkForm.condition} onChange={e => setBulkForm(f => ({ ...f, condition: e.target.value }))}>
                <option value="">— no change —</option>
                <option value="good">Good</option>
                <option value="damaged">Damaged</option>
                <option value="retired">Lost/unknown</option>
              </select>
            </div>
            <div className="field">
              <label>Location</label>
              <input type="text" value={bulkForm.storage_location} onChange={e => setBulkForm(f => ({ ...f, storage_location: e.target.value }))} placeholder="Leave blank to keep existing" />
            </div>
            <div className="field">
              <label>Notes</label>
              <input type="text" value={bulkForm.notes} onChange={e => setBulkForm(f => ({ ...f, notes: e.target.value }))} placeholder="Leave blank to keep existing" />
            </div>
            <div className="field form-actions">
              <button type="submit" className="btn primary" disabled={bulkSaving}>{bulkSaving ? 'Saving...' : `Update ${selectedIds.size} items`}</button>
              <button type="button" className="btn" onClick={() => setBulkEditMode(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && !bulkEditMode && (
        <div className={`bulk-bar${bulkConfirmDelete ? ' confirming' : ''}`}>
          {bulkConfirmDelete ? (
            <>
              <span className="bulk-count">Remove {selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''}?</span>
              <button className="btn danger" onClick={handleBulkDelete}>Yes, remove</button>
              <button className="btn" onClick={() => setBulkConfirmDelete(false)}>Cancel</button>
            </>
          ) : (
            <>
              <span className="bulk-count">{selectedIds.size} selected</span>
              <button className="btn" onClick={() => { setBulkEditMode(true); cancelEdit(); setShowForm(false) }}>Edit</button>
              <button className="btn danger" onClick={() => setBulkConfirmDelete(true)}>Delete</button>
              <button className="btn-link" onClick={() => { setSelectedIds(new Set()); setLastSelectedIdx(null) }}>Clear</button>
            </>
          )}
        </div>
      )}

      <div className="inventory-count">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</div>

      <table className={`table${isDragging ? ' no-select' : ''}`}>
        <thead>
          <tr>
            <th>Tag</th>
            <th>Name</th>
            <th>Category</th>
            <th>Size</th>
            <th>Condition</th>
            <th>Location</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((item, idx) => (
            <tr
              key={item.id}
              className={[
                editingId === item.id    ? 'row-editing'  : '',
                selectedIds.has(item.id) ? 'row-selected' : '',
              ].filter(Boolean).join(' ')}
              onMouseDown={e => handleRowMouseDown(e, idx)}
              onMouseEnter={() => handleRowMouseEnter(idx)}
              onClick={e => handleRowClick(e, idx)}
            >
              <td className="mono muted">{item.asset_tag || '—'}</td>
              <td>{item.name}</td>
              <td className="muted">{item.category || '—'}</td>
              <td className="muted">{item.size || '—'}</td>
              <td>
                <span className={`badge ${
                  item.condition === 'good'    ? 'success' :
                  item.condition === 'damaged' ? 'danger'  : 'muted'
                }`}>
                  {item.condition === 'retired' ? 'Lost/unknown' : item.condition.charAt(0).toUpperCase() + item.condition.slice(1)}
                </span>
              </td>
              <td className="muted">{item.storage_location || '—'}</td>
              <td
                className="row-actions"
                onClick={e => e.stopPropagation()}
                onMouseDown={e => e.stopPropagation()}
              >
                {confirmDelete === item.id ? (
                  <>
                    <span className="muted" style={{ fontSize: '0.8rem' }}>Remove?</span>
                    <button className="btn-link danger" onClick={() => handleDelete(item.id)}>Yes</button>
                    <button className="btn-link" onClick={() => setConfirmDelete(null)}>No</button>
                  </>
                ) : (
                  <>
                    <button className="btn-link" onClick={() => startEdit(item)}>Edit</button>
                    <button className="btn-link danger" onClick={() => { setConfirmDelete(item.id); cancelEdit() }}>Remove</button>
                  </>
                )}
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr><td colSpan={7} className="empty">No items found</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
