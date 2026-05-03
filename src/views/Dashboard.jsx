import { useState, useEffect } from 'react'
import { Layers, AlertTriangle } from 'lucide-react'
import { PackageCircleCheck, ClockCircleX } from '../icons'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  async function fetchItems() {
    const { data, error } = await supabase
      .from('item_status')
      .select('*')
      .order('name')
    if (!error) setItems(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchItems()

    const channel = supabase
      .channel('dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checkout_items' }, fetchItems)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, fetchItems)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  const filtered = items.filter(item => {
    if (filter === 'available') return item.status === 'available' && item.condition === 'good'
    if (filter === 'out')       return item.status === 'checked_out'
    if (filter === 'damaged')   return item.condition === 'damaged'
    return true
  })

  const stats = {
    total:     items.length,
    available: items.filter(i => i.status === 'available' && i.condition === 'good').length,
    out:       items.filter(i => i.status === 'checked_out').length,
    damaged:   items.filter(i => i.condition === 'damaged').length,
  }

  if (loading) return <div className="loading">Loading...</div>

  return (
    <div className="view">
      <div className="stats-bar">
        <StatCard label="Total"       value={stats.total}     Icon={Layers}        active={filter === 'all'}       onClick={() => setFilter('all')}       />
        <StatCard label="Available"   value={stats.available} Icon={PackageCircleCheck} active={filter === 'available'} onClick={() => setFilter('available')} variant="success" />
        <StatCard label="Checked out" value={stats.out}       Icon={ClockCircleX}       active={filter === 'out'}       onClick={() => setFilter('out')}       variant="warning" />
        <StatCard label="Damaged"     value={stats.damaged}   Icon={AlertTriangle} active={filter === 'damaged'}   onClick={() => setFilter('damaged')}   variant="danger"  />
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Category</th>
            <th>Size</th>
            <th>Status</th>
            <th>Borrower</th>
            <th>Since</th>
            <th>Due back</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(item => (
            <tr key={item.id} className={item.status === 'checked_out' ? 'row-out' : ''}>
              <td className="primary">
                {item.asset_tag && <span className="mono muted">{item.asset_tag} </span>}
                {item.name}
              </td>
              <td className="muted">{item.category || '—'}</td>
              <td className="muted">{item.size || '—'}</td>
              <td><StatusBadge item={item} /></td>
              <td className="primary">{item.borrower_name || '—'}</td>
              <td className="muted">{item.checked_out_at ? fmt(item.checked_out_at) : '—'}</td>
              <td className={item.expected_return_at && isOverdue(item.expected_return_at) ? 'overdue' : 'muted'}>
                {item.expected_return_at ? fmt(item.expected_return_at) : '—'}
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr><td colSpan={7} className="empty">No items</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function StatCard({ label, value, variant, Icon, active, onClick }) {
  return (
    <div className={`stat-card ${variant || ''} ${active ? 'selected' : ''}`} onClick={onClick}>
      <div className="stat-header">
        {Icon && <Icon size={20} strokeWidth={2.25} />}
        <span className="stat-label">{label}</span>
      </div>
      <div className="stat-value">{value}</div>
    </div>
  )
}

function StatusBadge({ item }) {
  if (item.condition === 'damaged') return <span className="badge danger">Damaged</span>
  if (item.condition === 'retired') return <span className="badge muted">Retired</span>
  if (item.status === 'checked_out') return <span className="badge warning">Out</span>
  return <span className="badge success">Available</span>
}

function fmt(iso) {
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

function isOverdue(iso) {
  return new Date(iso) < new Date()
}
