import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function titleCase(str) {
  return str.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase())
}

export default function CheckOut({ onDone }) {
  const [items, setItems] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [search, setSearch] = useState('')
  const [borrower, setBorrower] = useState('')
  const [borrowerEmail, setBorrowerEmail] = useState('')
  const [borrowerPhone, setBorrowerPhone] = useState('')
  const [staffName, setStaffName] = useState('')
  const [returnDate, setReturnDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAvailable() {
      const { data, error } = await supabase
        .from('item_status')
        .select('*')
        .eq('status', 'available')
        .eq('condition', 'good')
        .order('name')
      if (!error) setItems(data || [])
      setLoading(false)
    }
    fetchAvailable()
  }, [])

  const filtered = items.filter(item => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      item.name.toLowerCase().includes(q) ||
      (item.category || '').toLowerCase().includes(q) ||
      (item.size || '').toLowerCase().includes(q) ||
      (item.asset_tag || '').toLowerCase().includes(q)
    )
  })

  function toggle(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const hasContact = borrowerEmail.trim() || borrowerPhone.trim()
    if (selected.size === 0 || !borrower.trim() || !staffName.trim() || !hasContact) return
    setSubmitting(true)

    const { data: checkout, error: checkoutError } = await supabase
      .from('checkouts')
      .insert({
        borrower_name: borrower.trim(),
        borrower_email: borrowerEmail.trim() || null,
        borrower_phone: borrowerPhone.trim() || null,
        checked_out_by: staffName.trim(),
        expected_return_at: returnDate || null,
      })
      .select()
      .single()

    if (checkoutError) { console.error(checkoutError); setSubmitting(false); return }

    const { error: itemsError } = await supabase
      .from('checkout_items')
      .insert([...selected].map(item_id => ({ checkout_id: checkout.id, item_id })))

    if (itemsError) { console.error(itemsError); setSubmitting(false); return }

    onDone()
  }

  const selectedItems = items.filter(i => selected.has(i.id))

  if (loading) return <div className="loading">Loading...</div>

  return (
    <div className="view checkout-layout">
      <div className="checkout-items">
        <div className="section-header">
          <h2>Available Items</h2>
          <input
            className="search"
            type="search"
            placeholder="Search by name, size, category..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <table className="table table-checkout selectable">
          <thead>
            <tr>
              <th></th>
              <th>Item</th>
              <th>Category</th>
              <th>Size</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => (
              <tr
                key={item.id}
                className={selected.has(item.id) ? 'selected' : ''}
                onClick={() => toggle(item.id)}
              >
                <td>
                  <input
                    type="checkbox"
                    checked={selected.has(item.id)}
                    onChange={() => toggle(item.id)}
                    onClick={e => e.stopPropagation()}
                  />
                </td>
                <td>
                  {item.asset_tag && <span className="mono muted">{item.asset_tag} </span>}
                  {item.name}
                </td>
                <td className="muted">{item.category || '—'}</td>
                <td className="muted">{item.size || '—'}</td>
                <td className="muted">{item.storage_location || '—'}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="empty">No available items</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="checkout-form">
        <h2>Checkout Details</h2>

        {selectedItems.length > 0 && (
          <div className="selected-summary">
            <div className="selected-count">{selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected</div>
            <ul className="selected-list">
              {selectedItems.map(item => (
                <li key={item.id}>
                  {item.name}{item.size ? ` (${item.size})` : ''}
                  <button className="remove-btn" onClick={() => toggle(item.id)}>×</button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Borrower name *</label>
            <input
              type="text"
              value={borrower}
              onChange={e => setBorrower(titleCase(e.target.value))}
              autoCapitalize="words"
              placeholder="Who is taking these?"
            />
          </div>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={borrowerEmail}
              onChange={e => setBorrowerEmail(e.target.value)}
              placeholder="borrower@example.com"
            />
          </div>
          <div className="field">
            <label>Phone</label>
            <input
              type="tel"
              value={borrowerPhone}
              onChange={e => setBorrowerPhone(e.target.value)}
              placeholder="e.g. 555-0100"
            />
          </div>
          <p className="form-hint">At least one contact method (email or phone) is required.</p>
          <div className="field">
            <label>Staff *</label>
            <input
              type="text"
              value={staffName}
              onChange={e => setStaffName(titleCase(e.target.value))}
              autoCapitalize="words"
              placeholder="Your name"
            />
          </div>
          <div className="field">
            <label>Due back</label>
            <input
              type="date"
              value={returnDate}
              onChange={e => setReturnDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <button
            type="submit"
            className="btn primary"
            disabled={selected.size === 0 || !borrower.trim() || !staffName.trim() || (!borrowerEmail.trim() && !borrowerPhone.trim()) || submitting}
          >
            {submitting ? 'Processing...' : `Check Out${selected.size > 0 ? ` (${selected.size})` : ''}`}
          </button>
        </form>
      </div>
    </div>
  )
}
