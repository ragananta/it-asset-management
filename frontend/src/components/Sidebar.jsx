import { useNavigate, useLocation } from 'react-router-dom'

const menuItems = [
  {
    label: 'MAIN MENU',
    items: [
      { label: 'Dashboard',   path: '/',           icon: IconDashboard },
      { label: 'Master Aset', path: '/assets',     icon: IconDevices },
      { label: 'Kategori',    path: '/categories', icon: IconCategory },
    ]
  },
  {
    label: 'AKTIVITAS',
    items: [
      { label: 'Maintenance',    path: '/maintenance',  icon: IconBuild },
      { label: 'Audit Log',      path: '/audit-logs',   icon: IconClipboard },
      { label: 'Penugasan Aset', path: '/assignments',  icon: IconPerson },
      { label: 'Log Aktivitas',  path: '/logs',         icon: IconHistory },
    ]
  }
]

export default function Sidebar({ user, onLogout }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">IT</div>
        <div>
          <div className="sidebar-logo-text">IT Asset</div>
          <div className="sidebar-logo-sub">SALOKA MANAGEMENT</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="nav">
        {menuItems.map((section) => (
          <div key={section.label}>
            <div className="sidebar-section-label">{section.label}</div>
            {section.items.map((item) => (
              <div
                key={item.path}
                className={`nav-item ${pathname === item.path ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                <item.icon />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">
            {user?.name?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div className="sidebar-user-name" style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name || 'Administrator'}
            </div>
            <div className="sidebar-user-email" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.email || ''}
            </div>
          </div>
        </div>
        <div className="nav-item" onClick={onLogout} style={{ color: 'rgba(255,255,255,0.4)' }}>
          <IconLogout />
          <span>Logout</span>
        </div>
      </div>
    </aside>
  )
}

// ─── Inline SVG Icons ─────────────────────────────────
function IconDashboard() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
    </svg>
  )
}
function IconDevices() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="14" height="10" rx="2"/>
      <path d="M22 8v8"/><path d="M16 9h6M16 12h6M16 15h6"/>
    </svg>
  )
}
function IconCategory() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16M4 12h10M4 18h6"/>
    </svg>
  )
}
function IconBuild() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
    </svg>
  )
}
function IconClipboard() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
      <rect x="9" y="3" width="6" height="4" rx="1"/>
      <path d="M9 12h6M9 16h4"/>
    </svg>
  )
}
function IconPerson() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )
}
function IconHistory() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 109 9"/><path d="M3 12V6M3 12H9"/><path d="M12 8v4l3 3"/>
    </svg>
  )
}
function IconLogout() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
    </svg>
  )
}