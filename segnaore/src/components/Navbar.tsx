import { NavLink } from 'react-router-dom'

const links = [
  { to: '/calendar', label: 'Calendario', icon: '📅' },
  { to: '/report', label: 'Report', icon: '📊' },
  { to: '/oncall', label: 'Reperibilità', icon: '🚨' },
  { to: '/absences', label: 'Permessi', icon: '🏖️' },
  { to: '/settings', label: 'Impostazioni', icon: '⚙️' },
]

export default function Navbar() {
  return (
    <nav className="bg-blue-600 text-white sticky top-0 z-50">
      <div className="max-w-2xl mx-auto flex items-center justify-between px-4 h-14">
        <NavLink to="/" className="font-bold text-lg">⏱ SegnaOre</NavLink>
        <div className="flex gap-1">
          {links.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `px-2 py-1.5 rounded-md text-sm transition-colors ${
                  isActive ? 'bg-white/30' : 'hover:bg-white/15'
                }`
              }
            >
              <span className="sm:hidden text-lg">{link.icon}</span>
              <span className="hidden sm:inline">{link.icon} {link.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}
