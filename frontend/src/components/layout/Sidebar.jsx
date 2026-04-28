import { NavLink, useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import { isAdmin } from '../../utils/helpers'
import {
  LayoutDashboard, Users, Search, Building2,
  LogOut, Settings, ShieldCheck, FileText
} from 'lucide-react'

const NavItem = ({ to, icon: Icon, label, end = false }) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) =>
      `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all
       ${isActive
         ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
         : 'text-slate-300 hover:bg-white/10 hover:text-white'}`
    }
  >
    <Icon size={18} />
    {label}
  </NavLink>
)

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const admin = isAdmin(user?.role)
  const isSuperAdmin = user?.role === 'super_admin'

  return (
    <aside className="w-64 min-h-screen bg-[#0f2238] flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-sky-500 rounded-lg flex items-center justify-center">
            <ShieldCheck size={20} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">ZimCredit</p>
            <p className="text-slate-400 text-xs">Bureau Portal</p>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
          <div className="w-8 h-8 rounded-full bg-sky-500/30 flex items-center justify-center text-sky-300 font-bold text-sm">
            {user?.full_name?.[0] || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">{user?.full_name}</p>
            <p className="text-slate-400 text-xs capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="text-slate-500 text-xs uppercase font-semibold px-4 mb-2">Main</p>

        <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" end />

        {/* Individual & Company Searches — hidden for super admin */}
        {!isSuperAdmin && (
          <>
            <NavItem to="/searches/individuals" icon={Search} label="Individual Searches" />
            <NavItem to="/searches/companies" icon={Building2} label="Company Searches" />
          </>
        )}

        <NavItem to="/reports" icon={FileText} label="Reports" />

        {/* Administration section */}
        {admin && (
          <>
            <p className="text-slate-500 text-xs uppercase font-semibold px-4 mt-5 mb-2">Administration</p>
            <NavItem to="/admin/subscribers" icon={Building2} label="Subscribers" />
            {!isSuperAdmin && (
              <>
                <NavItem to="/admin/users" icon={Users} label="Users" />
                <NavItem to="/admin/searches" icon={Search} label="All Searches" />
              </>
            )}
          </>
        )}

        <p className="text-slate-500 text-xs uppercase font-semibold px-4 mt-5 mb-2">Account</p>
        <NavItem to="/profile" icon={Settings} label="Profile" />
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  )
}