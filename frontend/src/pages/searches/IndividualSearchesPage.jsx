import { useQuery } from '@tanstack/react-query'
import { individualSearchAPI } from '../../api'
import { PageHeader, Card, StatusBadge, ScoreDisplay, Button, EmptyState } from '../../components/ui'
import { formatDate } from '../../utils/helpers'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'

export default function IndividualSearchesPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(0)
  const limit = 10

  const { data, isLoading } = useQuery({
    queryKey: ['individual-searches', page],
    queryFn: () => individualSearchAPI.list({ skip: page * limit, limit }).then(r => r.data),
  })

  return (
    <div>
      <PageHeader
        title="Individual Searches"
        subtitle="Search history for all individuals"
        action={<Button onClick={() => navigate('/searches/individuals/new')} icon="➕">New Search</Button>}
      />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Ref #', 'Name', 'ID / Passport', 'Purpose', 'Score', 'Status', 'Date', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              )}
              {!isLoading && data?.length === 0 && (
                <tr><td colSpan={8}>
                  <EmptyState icon="🔍" title="No searches yet"
                    description="Create your first individual credit search"
                    action={<Button onClick={() => navigate('/searches/individuals/new')}>New Search</Button>} />
                </td></tr>
              )}
              {data?.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/searches/individuals/${s.id}`)}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{s.search_ref}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{s.individual_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{s.individual_id_number || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{s.search_purpose?.replace(/_/g,' ')}</td>
                  <td className="px-4 py-3"><ScoreDisplay score={s.credit_score} /></td>
                  <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(s.created_at)}</td>
                  <td className="px-4 py-3">
                    <button className="text-xs text-[#1a3a5c] hover:underline font-medium">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">Showing {data?.length ?? 0} results</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Prev</Button>
            <Button variant="secondary" size="sm" disabled={!data || data.length < limit} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      </Card>
    </div>
  )
}