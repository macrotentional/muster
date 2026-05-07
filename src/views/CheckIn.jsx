import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import ScanInput from '../components/ScanInput'

function titleCase(str) {
  return str.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase())
}

const CONDITIONS = [
  { value: 'good',    label: 'Good' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'lost',    label: 'Lost' },
]

export default function CheckIn({ onDone }) {
  const [items, setItems] = useState([])
  const [selected, setSelected] = useState({})
  const [staffName, setStaffName] = useState('')
  const [search, setSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCheckedOut() {
      const { data, error } = await supabase
        .from('item_status')
        .select('*')
        .eq('status', 'checked_out')
        .order('checked_out_at')
      if (!error) setItems(data || [])
      setLoading(false)
    }
    fetchCheckedOut()
  }, [])

  const filtered = items.filter(item => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      item.name.toLowerCase().includes(q) ||
      (item.borrower_name || '').toLowerCase().includes(q) ||
      (item.category || '').toLowerCase().includes(q) ||
      (item.size || '').toLowerCase().includes(q)
    )
  })

  function toggleSelect(item) {
    setSelected(prev => {
      const next = { ...prev }
      if (next[item.checkout_item_id]) {
        delete next[item.checkout_item_id]
      } else {
        next[item.checkout_item_id] = { condition: 'good', notes: '', item_id: item.id }
      }
      return next
    })
  }

  function updateField(checkoutItemId, field, value) {
    setSelected(prev => ({
      ...prev,
      [checkoutItemId]: { ...prev[checkoutItemId], [field]: value },
    }))
  }

  function setAllCondition(condition) {
    setSelected(prev => {
      const next = {}
      for (const [id, val] of Object.entries(prev)) {
        next[id] = { ...val, condition, notes: condition === 'good' ? '' : val.notes }
      }
      return next
    })
  }

  function selectAll() {
    setSelected(prev => {
      const next = { ...prev }
      for (const item of filtered) {
        if (!next[item.checkout_item_id]) {
          next[item.checkout_item_id] = { condition: 'good', notes: '', item_id: item.id }
        }
      }
      return next
    })
  }

  function clearSelection() {
    setSelected({})
  }

  function handleScan(code) {
    const upper = code.toUpperCase()
    const item = items.find(i => i.asset_tag?.toUpperCase() === upper)
    if (!item) return { ok: false, text: `${code}: not currently checked out` }
    if (selected[item.checkout_item_id]) return { ok: true, text: `${item.asset_tag} already in return` }
    setSelected(prev => ({
      ...prev,
      [item.checkout_item_id]: { condition: 'good', notes: '', item_id: item.id },
    }))
    return { ok: true, text: `+ ${item.asset_tag} ${item.name}${item.size ? ` (${item.size})` : ''}` }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const entries = Object.entries(selected)
    if (entries.length === 0 || !staffName.trim()) return
    setSubmitting(true)

    const now = new Date().toISOString()
    const staff = staffName.trim()

    // Mark all selected checkout_items as returned, in parallel
    await Promise.all(entries.map(([checkoutItemId, { condition, notes }]) =>
      supabase
        .from('checkout_items')
        .update({
          checked_in_at: now,
          checked_in_by: staff,
          condition_on_return: condition,
          return_notes: notes.trim() || null,
        })
        .eq('id', checkoutItemId)
    ))

    // Group item-condition updates so each touches the DB once
    const damagedIds = entries.filter(([, v]) => v.condition === 'damaged').map(([, v]) => v.item_id)
    const lostIds    = entries.filter(([, v]) => v.condition === 'lost').map(([, v]) => v.item_id)

    await Promise.all([
      damagedIds.length > 0 && supabase.from('items').update({ condition: 'damaged' }).in('id', damagedIds),
      lostIds.length    > 0 && supabase.from('items').update({ condition: 'retired', notes: 'Reported lost' }).in('id', lostIds),
    ].filter(Boolean))

    onDone()
  }

  const selectedCount = Object.keys(selected).length

  if (loading) return <div className="loading">Loading...</div>

  return (
    <div className="view">
      <div className="toolbar">
        <span style={{ fontSize: 14, fontWeight: 600 }}>
          {items.length} item{items.length !== 1 ? 's' : ''} checked out
        </span>
        <input
          className="search"
          type="search"
          placeholder="Search by item or borrower..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <ScanInput onScan={handleScan} placeholder="Scan barcode or type asset tag, then Enter…" />

      {selectedCount > 0 && (
        <div className="bulk-shortcuts">
          <span className="bulk-shortcuts-label">{selectedCount} selected · set all to:</span>
          <button type="button" className="condition-option active good"  onClick={() => setAllCondition('good')}>Good</button>
          <button type="button" className="condition-option active damaged" onClick={() => setAllCondition('damaged')}>Damaged</button>
          <button type="button" className="condition-option active lost"  onClick={() => setAllCondition('lost')}>Lost</button>
          <span className="bulk-shortcuts-spacer" />
          <button type="button" className="btn-link" onClick={selectAll}>Select all visible</button>
          <button type="button" className="btn-link" onClick={clearSelection}>Clear</button>
        </div>
      )}
      {selectedCount === 0 && filtered.length > 0 && (
        <div className="bulk-shortcuts subtle">
          <button type="button" className="btn-link" onClick={selectAll}>Select all visible ({filtered.length})</button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <table className="table table-checkin selectable">
          <thead>
            <tr>
              <th></th>
              <th>Item</th>
              <th>Size</th>
              <th>Borrower</th>
              <th>Since</th>
              <th>Due</th>
              <th>Condition on return</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => {
              const isSelected = !!selected[item.checkout_item_id]
              const entry = selected[item.checkout_item_id]
              return (
                <tr
                  key={item.checkout_item_id}
                  className={isSelected ? 'selected' : ''}
                  onClick={() => toggleSelect(item)}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(item)}
                      onClick={e => e.stopPropagation()}
                    />
                  </td>
                  <td>{item.name}</td>
                  <td className="muted">{item.size || '—'}</td>
                  <td>{item.borrower_name}</td>
                  <td className="muted">{fmt(item.checked_out_at)}</td>
                  <td className={item.expected_return_at && isOverdue(item.expected_return_at) ? 'overdue' : 'muted'}>
                    {item.expected_return_at ? fmt(item.expected_return_at) : '—'}
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    {isSelected && (
                      <div className="condition-selector">
                        {CONDITIONS.map(c => (
                          <label
                            key={c.value}
                            className={`condition-option ${entry.condition === c.value ? 'active' : ''} ${c.value}`}
                          >
                            <input
                              type="radio"
                              name={`condition-${item.checkout_item_id}`}
                              value={c.value}
                              checked={entry.condition === c.value}
                              onChange={() => updateField(item.checkout_item_id, 'condition', c.value)}
                            />
                            {c.label}
                          </label>
                        ))}
                      </div>
                    )}
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    {isSelected && entry.condition !== 'good' && (
                      <input
                        className="notes-input"
                        type="text"
                        placeholder="Describe..."
                        value={entry.notes}
                        onChange={e => updateField(item.checkout_item_id, 'notes', e.target.value)}
                      />
                    )}
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="empty">No items checked out</td></tr>
            )}
          </tbody>
        </table>

        {selectedCount > 0 && (
          <div className="submit-bar">
            <div className="field inline">
              <label>Staff *</label>
              <input
                type="text"
                value={staffName}
                onChange={e => setStaffName(titleCase(e.target.value))}
                autoCapitalize="words"
                placeholder="Your name"
              />
            </div>
            <button
              type="submit"
              className="btn primary"
              disabled={!staffName.trim() || submitting}
            >
              {submitting ? 'Processing...' : `Return ${selectedCount} Item${selectedCount !== 1 ? 's' : ''}`}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}

function fmt(iso) {
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

function isOverdue(iso) {
  return new Date(iso) < new Date()
}
