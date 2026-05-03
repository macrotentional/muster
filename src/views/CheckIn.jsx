import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

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

  async function handleSubmit(e) {
    e.preventDefault()
    const entries = Object.entries(selected)
    if (entries.length === 0 || !staffName.trim()) return
    setSubmitting(true)

    const now = new Date().toISOString()

    for (const [checkoutItemId, { condition, notes, item_id }] of entries) {
      await supabase
        .from('checkout_items')
        .update({
          checked_in_at: now,
          checked_in_by: staffName.trim(),
          condition_on_return: condition,
          return_notes: notes.trim() || null,
        })
        .eq('id', checkoutItemId)

      if (condition === 'damaged') {
        await supabase.from('items').update({ condition: 'damaged' }).eq('id', item_id)
      }
      if (condition === 'lost') {
        await supabase.from('items').update({ condition: 'retired', notes: 'Reported lost' }).eq('id', item_id)
      }
    }

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

      <form onSubmit={handleSubmit}>
        <table className="table selectable">
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
