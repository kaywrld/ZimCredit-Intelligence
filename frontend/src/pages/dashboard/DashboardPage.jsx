import { useQuery } from '@tanstack/react-query'
import { dashboardAPI } from '../../api'
import { Card, CardHeader, PageHeader } from '../../components/ui'
import { formatDate } from '../../utils/helpers'
import { useNavigate } from 'react-router-dom'

// ── Inline stat card (white bg, subtle border) ───────────────────────────────
function SuperStatCard({ label, value, icon, sub }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5 flex items-start gap-3 sm:gap-4">
      <div className="text-2xl sm:text-3xl shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide truncate">{label}</p>
        <p className="text-xl sm:text-2xl font-bold text-gray-800 mt-0.5 truncate">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  )
}

// ── Status pill ───────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const styles = {
    active: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    pending: 'bg-amber-50 text-amber-700 border border-amber-200',
    inactive: 'bg-gray-100 text-gray-500 border border-gray-200',
  }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] ?? styles.inactive}`}>
      {status ?? '—'}
    </span>
  )
}

// ── Mobile subscriber card (shown on xs screens) ─────────────────────────────
function SubscriberCard({ sub, index, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm cursor-pointer hover:border-[#1a3a5c]/30 hover:shadow-md transition-all"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-gray-400 shrink-0">#{index + 1}</span>
          <p className="text-sm font-semibold text-gray-800 truncate">{sub.name}</p>
        </div>
        <StatusPill status={sub.status} />
      </div>
      <p className="text-xs text-gray-400 mb-3 truncate">{sub.industry}</p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-gray-400">Admins</p>
          <p className="font-semibold text-gray-700 mt-0.5">{sub.user_count}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-gray-400">Searches</p>
          <p className="font-semibold text-gray-700 mt-0.5">{sub.total_searches}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-gray-400">Joined</p>
          <p className="font-semibold text-gray-700 mt-0.5">
            {sub.joined ? new Date(sub.joined).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
          </p>
        </div>
        <div className="bg-[#1a3a5c]/5 rounded-lg p-2">
          <p className="text-[#1a3a5c]/70">Amount Owed</p>
          <p className="font-bold text-[#1a3a5c] mt-0.5">${sub.amount_owed?.toFixed(2)}</p>
        </div>
      </div>
    </div>
  )
}

// ── Main dashboard ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardAPI.getStats().then(r => r.data),
    refetchInterval: 60000,
  })

  const isSuperAdmin = data?.role === 'super_admin'

  // ── Regular admin/user view ─────────────────────────────────────────────────
  if (!isSuperAdmin) {
    return (
      <div>
        <PageHeader title="Dashboard" subtitle="Welcome to ZimCredit Intelligence" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <SuperStatCard label="Individual Searches" value={data?.total_individual_searches ?? '—'} sub="All time" />
          <SuperStatCard label="Company Searches" value={data?.total_company_searches ?? '—'} sub="All time" />
          <SuperStatCard label="Today Individuals" value={data?.daily_individual_searches ?? '—'} sub="Today" />
          <SuperStatCard label="Today Companies" value={data?.daily_company_searches ?? '—'} sub="Today" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Card>
            <CardHeader
              title="Recent Individual Searches"
              action={
                <button onClick={() => navigate('/searches/individuals/new')}
                  className="text-xs bg-[#1a3a5c] text-white px-3 py-1.5 rounded-lg hover:bg-[#0f2238]">
                  + New Search
                </button>
              }
            />
            <div className="divide-y divide-gray-50">
              {isLoading && <p className="p-6 text-sm text-gray-400">Loading...</p>}
              {!isLoading && data?.recent_individual_searches?.length === 0 &&
                <p className="p-6 text-sm text-gray-400">No searches yet</p>}
              {data?.recent_individual_searches?.map(s => (
                <div key={s.id}
                  onClick={() => navigate(`/searches/individuals/${s.id}`)}
                  className="flex items-center justify-between px-4 sm:px-6 py-3 hover:bg-gray-50 cursor-pointer">
                  <div className="min-w-0 mr-3">
                    <p className="text-sm font-medium text-gray-800 truncate">{s.search_ref}</p>
                    <p className="text-xs text-gray-400">{formatDate(s.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusPill status={s.status} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Recent Company Searches"
              action={
                <button onClick={() => navigate('/searches/companies')}
                  className="text-xs bg-[#1a3a5c] text-white px-3 py-1.5 rounded-lg hover:bg-[#0f2238]">
                  + New Search
                </button>
              }
            />
            <div className="divide-y divide-gray-50">
              {isLoading && <p className="p-6 text-sm text-gray-400">Loading...</p>}
              {!isLoading && data?.recent_company_searches?.length === 0 &&
                <p className="p-6 text-sm text-gray-400">No searches yet</p>}
              {data?.recent_company_searches?.map(s => (
                <div key={s.id} className="flex items-center justify-between px-4 sm:px-6 py-3 hover:bg-gray-50 cursor-pointer">
                  <div className="min-w-0 mr-3">
                    <p className="text-sm font-medium text-gray-800 truncate">{s.search_ref}</p>
                    <p className="text-xs text-gray-400">{formatDate(s.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusPill status={s.status} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // ── Super admin view ────────────────────────────────────────────────────────
  const now = new Date()
  const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div>
      <PageHeader
        title="Super Admin Dashboard"
        subtitle="ZimCredit Intelligence — Subscriber Overview"
      />

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <SuperStatCard
          label="Active Subscribers"
          value={isLoading ? '—' : data?.total_subscribers ?? 0}
          sub="Companies on platform"
        />
        <SuperStatCard
          label={`Searches — ${monthName}`}
          value={isLoading ? '—' : data?.total_searches ?? 0}
          sub="Individual + company this month"
        />
        <SuperStatCard
          label={`Income — ${monthName}`}
          value={isLoading ? '—' : `$${data?.total_revenue?.toFixed(2) ?? '0.00'}`}
          sub={`@ $${data?.cost_per_search ?? '0.05'} / search`}
        />
      </div>

      {/* ── Pending badge ── */}
      {(data?.total_pending ?? 0) > 0 && (
        <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <span className="text-amber-500 text-lg">⏳</span>
          <p className="text-sm text-amber-700">
            <span className="font-semibold">{data.total_pending}</span> subscriber{data.total_pending > 1 ? 's' : ''} pending approval
          </p>
        </div>
      )}

      {/* ── Subscriber table — desktop ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Subscribed Companies</h2>
            <p className="text-xs text-gray-400 mt-0.5">All companies registered on the platform</p>
          </div>
          <button
            onClick={() => navigate('/admin/subscribers')}
            className="shrink-0 text-xs bg-[#1a3a5c] text-white px-3 py-1.5 rounded-lg hover:bg-[#0f2238] transition-colors"
          >
            + Add Subscriber
          </button>
        </div>

        {isLoading && (
          <p className="p-8 text-sm text-gray-400 text-center">Loading subscribers...</p>
        )}

        {!isLoading && (!data?.subscribers || data.subscribers.length === 0) && (
          <p className="p-8 text-sm text-gray-400 text-center">No subscribers yet</p>
        )}

        {/* Desktop table — hidden on mobile */}
        {!isLoading && data?.subscribers?.length > 0 && (
          <>
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wide">
                    <th className="text-left px-4 sm:px-6 py-3 font-medium">#</th>
                    <th className="text-left px-3 py-3 font-medium">Company</th>
                    <th className="text-left px-3 py-3 font-medium">Industry</th>
                    <th className="text-left px-3 py-3 font-medium">Status</th>
                    <th className="text-center px-3 py-3 font-medium">Admins</th>
                    <th className="text-center px-3 py-3 font-medium">Searches</th>
                    <th className="text-right px-3 py-3 font-medium">Amount Owed</th>
                    <th className="text-right px-4 sm:px-6 py-3 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.subscribers.map((sub, i) => (
                    <tr
                      key={sub.id}
                      onClick={() => navigate(`/subscribers/${sub.id}`)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 sm:px-6 py-3.5 text-xs text-gray-400">{i + 1}</td>
                      <td className="px-3 py-3.5">
                        <p className="font-medium text-gray-800">{sub.name}</p>
                      </td>
                      <td className="px-3 py-3.5 text-gray-500 text-xs">{sub.industry}</td>
                      <td className="px-3 py-3.5">
                        <StatusPill status={sub.status} />
                      </td>
                      <td className="px-3 py-3.5 text-center text-gray-700 font-medium">{sub.user_count}</td>
                      <td className="px-3 py-3.5 text-center text-gray-700 font-medium">{sub.total_searches}</td>
                      <td className="px-3 py-3.5 text-right">
                        <span className="font-semibold text-[#1a3a5c]">${sub.amount_owed?.toFixed(2)}</span>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 text-right text-xs text-gray-400 whitespace-nowrap">
                        {sub.joined
                          ? new Date(sub.joined).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Totals row */}
                <tfoot>
                  <tr className="bg-[#1a3a5c]/5 border-t border-[#1a3a5c]/10">
                    <td className="px-4 sm:px-6 py-3" />
                    <td className="px-3 py-3 text-xs font-semibold text-gray-600">TOTALS</td>
                    <td className="px-3 py-3" />
                    <td className="px-3 py-3" />
                    <td className="px-3 py-3 text-center text-xs font-semibold text-gray-700">
                      {data.subscribers.reduce((s, r) => s + (r.user_count ?? 0), 0)}
                    </td>
                    <td className="px-3 py-3 text-center text-xs font-semibold text-gray-700">
                      {data.total_searches}
                    </td>
                    <td className="px-3 py-3 text-right text-xs font-bold text-[#1a3a5c]">
                      ${data.total_revenue?.toFixed(2)}
                    </td>
                    <td className="px-4 sm:px-6 py-3" />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile cards — shown only on xs */}
            <div className="sm:hidden p-3 space-y-3">
              {data.subscribers.map((sub, i) => (
                <SubscriberCard
                  key={sub.id}
                  sub={sub}
                  index={i}
                  onClick={() => navigate(`/subscribers/${sub.id}`)}
                />
              ))}
              {/* Mobile totals */}
              <div className="bg-[#1a3a5c]/5 border border-[#1a3a5c]/10 rounded-xl p-4">
                <p className="text-xs font-semibold text-[#1a3a5c] mb-2 uppercase tracking-wide">Totals</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-gray-400">Total Searches</p>
                    <p className="font-bold text-gray-800 mt-0.5">{data.total_searches}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Total Revenue</p>
                    <p className="font-bold text-[#1a3a5c] mt-0.5">${data.total_revenue?.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}