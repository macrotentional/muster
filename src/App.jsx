import { useState } from 'react'
import { BarChart2, ShoppingBag, ClipboardList } from 'lucide-react'
import { PackageReturn } from './icons'
import Dashboard from './views/Dashboard'
import CheckOut from './views/CheckOut'
import CheckIn from './views/CheckIn'
import Inventory from './views/Inventory'

const VIEWS = {
  DASHBOARD: 'dashboard',
  CHECKOUT: 'checkout',
  CHECKIN: 'checkin',
  INVENTORY: 'inventory',
}

const NAV = [
  { key: VIEWS.DASHBOARD,  label: 'Overview',          Icon: BarChart2          },
  { key: VIEWS.CHECKOUT,   label: 'Check out',         Icon: ShoppingBag      },
  { key: VIEWS.CHECKIN,    label: 'Return',            Icon: PackageReturn  },
  { key: VIEWS.INVENTORY,  label: 'Inventory',         Icon: ClipboardList      },
]

export default function App() {
  const [view, setView] = useState(VIEWS.DASHBOARD)

  return (
    <div>
      <nav className="nav">
        <span className="nav-brand">Muster</span>
        <div className="nav-tabs">
          {NAV.map(({ key, label, Icon }) => (
            <button
              key={key}
              className={`nav-tab ${view === key ? 'active' : ''}`}
              onClick={() => setView(key)}
            >
              <Icon size={14} strokeWidth={2} />
              {label}
            </button>
          ))}
        </div>
      </nav>
      <main className="main">
        {view === VIEWS.DASHBOARD  && <Dashboard />}
        {view === VIEWS.CHECKOUT   && <CheckOut  onDone={() => setView(VIEWS.DASHBOARD)} />}
        {view === VIEWS.CHECKIN    && <CheckIn   onDone={() => setView(VIEWS.DASHBOARD)} />}
        {view === VIEWS.INVENTORY  && <Inventory />}
      </main>
    </div>
  )
}
