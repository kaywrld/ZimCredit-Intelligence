import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { Bell } from 'lucide-react'
import useAuthStore from '../../store/authStore'

export default function AppLayout() {
  const { user } = useAuthStore()

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
          <div />
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
              <Bell size={18} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#1a3a5c] flex items-center justify-center text-white text-sm font-bold">
                {user?.full_name?.[0] || 'U'}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-800">{user?.full_name}</p>
                <p className="text-xs text-gray-500">{user?.subscriber?.name || 'ZimCredit Intelligence'}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="text-center text-xs text-gray-400 py-3 border-t border-gray-200 bg-white">
          © {new Date().getFullYear()} ZimCredit Intelligence · Portcullis (Pvt) Ltd · All rights reserved
        </footer>
      </div>
    </div>
  )
}
