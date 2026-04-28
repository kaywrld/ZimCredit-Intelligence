import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center min-h-96 text-center">
      <p className="text-8xl font-bold text-gray-200">404</p>
      <h2 className="text-2xl font-bold text-gray-700 mt-4">Page Not Found</h2>
      <p className="text-gray-500 mt-2 mb-6">The page you're looking for doesn't exist.</p>
      <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
    </div>
  )
}