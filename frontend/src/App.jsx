import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'

import useAuthStore from './store/authStore'
import ProtectedRoute from './components/layout/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'
import LoginPage from './pages/auth/LoginPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import IndividualSearchesPage from './pages/searches/IndividualSearchesPage'
import NewIndividualSearchPage from './pages/searches/NewIndividualSearchPage'
import SearchDetailPage from './pages/searches/SearchDetailPage'
import ProfilePage from './pages/ProfilePage'
import NotFoundPage from './pages/NotFoundPage'
import SubscribersPage from './pages/admin/SubscribersPage'
import SubscriberDetailPage from './pages/admin/SubscriberDetailPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30000 },
  },
})

function AppInitializer({ children }) {
  const loadUser = useAuthStore((s) => s.loadUser)
  useEffect(() => { loadUser() }, [])
  return children
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppInitializer>
          <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected */}
            <Route path="/" element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="searches/individuals" element={<IndividualSearchesPage />} />
              <Route path="searches/individuals/new" element={<NewIndividualSearchPage />} />
              <Route path="searches/individuals/:id" element={<SearchDetailPage />} />
              <Route path="admin/subscribers" element={<SubscribersPage />} />
              <Route path="admin/subscribers/:id" element={<SubscriberDetailPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </AppInitializer>
      </BrowserRouter>
    </QueryClientProvider>
  )
}