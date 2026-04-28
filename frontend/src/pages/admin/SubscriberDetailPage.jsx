import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Building2, Mail, Phone, Globe, MapPin,
  Shield, Users, Plus, ToggleLeft, ToggleRight,
  ChevronDown, ChevronUp, FileText, Calendar,
  Star, UserCheck, User, CheckCircle,
  Clock, XCircle, AlertCircle, Hash, Briefcase,
  Eye, EyeOff, Search, DollarSign, TrendingUp,
  ChevronRight, X, Filter, BarChart2,
  ExternalLink, Download
} from 'lucide-react'
import { subscribersAPI } from '../../api/index'
import { Button, Modal, Input, Spinner, Card } from '../../components/ui/index'
import { formatDate, formatDateTime } from '../../utils/helpers'

// ── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  active:    { label: 'Active',    icon: CheckCircle,  cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pending:   { label: 'Pending',   icon: Clock,        cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  suspended: { label: 'Suspended', icon: XCircle,      cls: 'bg-red-50 text-red-700 border-red-200' },
  inactive:  { label: 'Inactive',  icon: AlertCircle,  cls: 'bg-gray-50 text-gray-600 border-gray-200' },
}

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]

const SEARCH_STATUS_COLOR = {
  open:          'bg-blue-50 text-blue-700',
  good:          'bg-emerald-50 text-emerald-700',
  green:         'bg-emerald-50 text-emerald-700',
  adverse:       'bg-red-50 text-red-700',
  pep:           'bg-purple-50 text-purple-700',
  fair:          'bg-amber-50 text-amber-700',
  rejected:      'bg-red-50 text-red-700',
  processing:    'bg-sky-50 text-sky-700',
  inconclusive:  'bg-gray-100 text-gray-600',
  confirmation:  'bg-orange-50 text-orange-700',
  confirmed:     'bg-teal-50 text-teal-700',
  incomplete:    'bg-gray-100 text-gray-500',
}

function SubStatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.inactive
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${cfg.cls}`}>
      <Icon size={12} />
      {cfg.label}
    </span>
  )
}

function InfoRow({ icon: Icon, label, value, mono = false }) {
  if (!value) return null
  return ( 
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={13} className="text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
        <p className={`text-sm text-gray-800 mt-0.5 wrap-break-word ${mono ? 'font-mono' : ''}`}>{value}</p>
      </div>
    </div>
  )
}

function SectionCard({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/60 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[#1a3a5c]/10 flex items-center justify-center">
            <Icon size={14} className="text-[#1a3a5c]" />
          </div>
          <span className="font-semibold text-gray-800 text-sm">{title}</span>
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>
      {open && <div className="px-5 pb-4 border-t border-gray-100">{children}</div>}
    </Card>
  )
}

// ── Searches Drawer ──────────────────────────────────────────────────────────

function SearchesDrawer({ open, onClose, subscriberId, subscriberName, initialMonth, initialYear }) {
  const now = new Date()
  const [filterMonth, setFilterMonth] = useState(initialMonth ?? now.getMonth() + 1)
  const [filterYear,  setFilterYear]  = useState(initialYear  ?? now.getFullYear())
  const [filterUser,  setFilterUser]  = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['subscriber-searches', subscriberId, filterMonth, filterYear],
    queryFn: () => subscribersAPI.getSearches(subscriberId, { month: filterMonth, year: filterYear }),
    select: r => r.data,
    enabled: open,
  })

  const adminOptions = useMemo(() => {
    if (!data?.admin_summary) return []
    return data.admin_summary.map(a => ({
      value: a.user_id,
      label: `${a.name} (${a.search_count})`
    }))
  }, [data])

  const filteredSearches = useMemo(() => {
    if (!data?.searches) return []
    if (!filterUser) return data.searches
    return data.searches.filter(s => s.searched_by_id === filterUser)
  }, [data, filterUser])

  const yearOptions = []
  for (let y = now.getFullYear(); y >= 2024; y--) yearOptions.push(y)

  const filteredCost = ((filteredSearches.length) * (data?.cost_per_search ?? 0.05)).toFixed(2)

  // ── CSV download ──────────────────────────────────────────────────────────
  function downloadCSV() {
    const adminLabel = filterUser
      ? (data?.admin_summary?.find(a => a.user_id === filterUser)?.name ?? 'filtered')
      : 'all-admins'
    const filename = `${subscriberName.replace(/\s+/g, '_')}_searches_${MONTH_NAMES[filterMonth - 1]}_${filterYear}_${adminLabel}.csv`

    const headers = [
      'Search Ref',
      'Individual Name',
      'ID / Passport',
      'Date of Birth',
      'Search Purpose',
      'Status',
      'Credit Score',
      'Searched By',
      'Searched By Email',
      'Date & Time',
      'Cost (USD)',
    ]

    const costPerSearch = data?.cost_per_search ?? 0.05

    const rows = filteredSearches.map(s => [
      s.search_ref ?? '',
      s.individual_name ?? '',
      s.individual_id ?? '',
      s.individual_dob ?? '',
      s.search_purpose ?? '',
      s.status?.toUpperCase() ?? '',
      s.credit_score ?? '',
      s.searched_by_name ?? '',
      s.searched_by_email ?? '',
      s.created_at ? new Date(s.created_at).toLocaleString('en-ZW') : '',
      costPerSearch.toFixed(2),
    ])

    // Summary rows at the bottom
    const blankRow = Array(headers.length).fill('')
    const summaryHeader = ['', '', '', '', '', '', '', '', '', 'TOTAL SEARCHES', 'TOTAL COST']
    const summaryValues = ['', '', '', '', '', '', '', '', '', filteredSearches.length, filteredCost]

    const allRows = [headers, ...rows, blankRow, summaryHeader, summaryValues]

    const csv = allRows
      .map(row =>
        row.map(cell => {
          const str = String(cell ?? '')
          // Wrap in quotes if contains comma, quote, or newline
          return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
        }).join(',')
      )
      .join('\r\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href     = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-3xl bg-white h-full flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="font-bold text-gray-900 text-base">Search History</h2>
            <p className="text-xs text-gray-500 mt-0.5">{subscriberName}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Download CSV — only enabled when data has loaded */}
            <button
              onClick={downloadCSV}
              disabled={!data || filteredSearches.length === 0}
              title="Download as CSV"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600
                hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Download size={13} />
              Download CSV
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filters bar */}
        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/60 shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <Filter size={13} className="text-gray-400 shrink-0" />
            <select
              value={filterMonth}
              onChange={e => { setFilterMonth(Number(e.target.value)); setFilterUser('') }}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30"
            >
              {MONTH_NAMES.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              value={filterYear}
              onChange={e => { setFilterYear(Number(e.target.value)); setFilterUser('') }}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30"
            >
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select
              value={filterUser}
              onChange={e => setFilterUser(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]/30"
            >
              <option value="">All Admins</option>
              {adminOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {filterUser && (
              <button
                onClick={() => setFilterUser('')}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <X size={11} /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Summary bar */}
        {data && (
          <div className="px-6 py-3 border-b border-gray-100 shrink-0 flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                <Search size={13} className="text-violet-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400 leading-none">
                  {filterUser ? 'Filtered searches' : 'Total searches'}
                </p>
                <p className="text-base font-bold text-gray-800">{filteredSearches.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                <DollarSign size={13} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400 leading-none">
                  {filterUser ? 'Filtered cost' : 'Month cost'}
                </p>
                <p className="text-base font-bold text-gray-800">${filteredCost}</p>
              </div>
            </div>
            <div className="text-xs text-gray-400 ml-auto">
              ${data.cost_per_search ?? 0.05} / search
            </div>
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Spinner size="lg" />
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500 text-sm">
              Failed to load search history.
            </div>
          ) : (
            <>
              {/* Per-admin summary table (shown when no user filter active) */}
              {!filterUser && data?.admin_summary?.length > 0 && (
                <div className="px-6 pt-5 pb-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <BarChart2 size={12} /> Admin Summary — click row to filter
                  </p>
                  <div className="rounded-xl border border-gray-100 overflow-hidden mb-2">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-xs text-gray-500 font-semibold">
                          <th className="px-4 py-2.5 text-left">Admin</th>
                          <th className="px-4 py-2.5 text-right">Searches</th>
                          <th className="px-4 py-2.5 text-right">Cost</th>
                          <th className="px-4 py-2.5 w-6"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {data.admin_summary.map(a => (
                          <tr
                            key={a.user_id}
                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => setFilterUser(a.user_id)}
                          >
                            <td className="px-4 py-2.5">
                              <p className="font-medium text-gray-800">{a.name}</p>
                              <p className="text-xs text-gray-400">{a.email}</p>
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold text-gray-700">{a.search_count}</td>
                            <td className="px-4 py-2.5 text-right text-emerald-700 font-medium">${a.cost.toFixed(2)}</td>
                            <td className="px-4 py-2.5">
                              <ChevronRight size={13} className="text-gray-300" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-50 text-xs font-bold border-t border-gray-200">
                          <td className="px-4 py-2.5 text-gray-700">Total</td>
                          <td className="px-4 py-2.5 text-right text-gray-700">{data.total_searches}</td>
                          <td className="px-4 py-2.5 text-right text-emerald-700">${data.total_cost?.toFixed(2)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Search records list */}
              <div className="px-6 pb-8 pt-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Search size={12} /> Search Records
                  {filterUser && data?.admin_summary && (
                    <span className="normal-case font-normal text-gray-400">
                      — {data.admin_summary.find(a => a.user_id === filterUser)?.name}
                    </span>
                  )}
                </p>

                {filteredSearches.length === 0 ? (
                  <div className="text-center py-12">
                    <Search size={32} className="text-gray-200 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 font-medium">No searches found</p>
                    <p className="text-xs text-gray-400 mt-1">
                      No searches for {MONTH_NAMES[filterMonth - 1]} {filterYear}
                      {filterUser ? ' by this admin' : ''}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredSearches.map(s => (
                      <div
                        key={s.id}
                        className="flex items-start gap-3 p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 transition-all"
                      >
                        <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                          <User size={15} className="text-gray-400" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div>
                              <p className="font-semibold text-gray-800 text-sm leading-tight">
                                {s.individual_name || <span className="text-gray-400 italic text-sm">Unknown Individual</span>}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {s.individual_id && (
                                  <span className="text-xs text-gray-400 font-mono">{s.individual_id}</span>
                                )}
                                {s.individual_dob && (
                                  <span className="text-xs text-gray-400">b. {s.individual_dob}</span>
                                )}
                              </div>
                            </div>
                            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full shrink-0 ${
                              SEARCH_STATUS_COLOR[s.status] || 'bg-gray-100 text-gray-600'
                            }`}>
                              {s.status?.toUpperCase()}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md font-mono">
                              {s.search_ref}
                            </span>
                            {s.search_purpose && (
                              <span className="text-xs text-gray-500">{s.search_purpose}</span>
                            )}
                            {s.credit_score && (
                              <span className="text-xs font-semibold text-gray-600">
                                Score: {s.credit_score}
                              </span>
                            )}
                          </div>

                          {/* Who searched */}
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-50">
                            <div className="w-5 h-5 rounded-md bg-sky-50 flex items-center justify-center">
                              <UserCheck size={10} className="text-sky-500" />
                            </div>
                            <p className="text-xs text-gray-500 flex-1 min-w-0">
                              <span className="font-medium text-gray-700">{s.searched_by_name}</span>
                              {s.searched_by_email && (
                                <span className="text-gray-400"> · {s.searched_by_email}</span>
                              )}
                            </p>
                            <span className="text-xs text-gray-400 shrink-0">
                              {s.created_at ? formatDateTime(s.created_at) : '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Add Admin Modal ──────────────────────────────────────────────────────────

const ADMIN_INITIAL = {
  full_name: '', email: '', password: '', confirm_password: '',
  mobile: '', phone: '', role: 'standard_user',
}

function AddAdminModal({ open, onClose, subscriberId, onSuccess }) {
  const [form, setForm] = useState(ADMIN_INITIAL)
  const [errors, setErrors] = useState({})
  const [showPw, setShowPw] = useState(false)

  const set = (f, v) => {
    setForm(prev => ({ ...prev, [f]: v }))
    if (errors[f]) setErrors(e => ({ ...e, [f]: '' }))
  }

  const validate = () => {
    const errs = {}
    if (!form.full_name.trim()) errs.full_name = 'Full name is required'
    if (!form.email.trim()) errs.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email'
    if (!form.password) errs.password = 'Password is required'
    else if (form.password.length < 8) errs.password = 'Minimum 8 characters'
    if (form.password !== form.confirm_password) errs.confirm_password = 'Passwords do not match'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const mutation = useMutation({
    mutationFn: (data) => subscribersAPI.addAdmin(subscriberId, data),
    onSuccess: () => {
      toast.success('Admin user created successfully!')
      setForm(ADMIN_INITIAL)
      onSuccess()
      onClose()
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to create admin')
    },
  })

  const handleSubmit = () => {
    if (!validate()) return
    const { confirm_password, ...payload } = form
    mutation.mutate(payload)
  }

  const handleClose = () => { setForm(ADMIN_INITIAL); setErrors({}); onClose() }

  return (
    <Modal open={open} onClose={handleClose} title="Add Admin User" size="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 mb-2">
          {[
            {
              value: 'main_admin',
              label: 'Main Admin',
              desc: 'Can add admins, search & download reports',
              icon: Star,
              color: 'border-amber-400 bg-amber-50 text-amber-800',
              check: 'bg-amber-500',
            },
            {
              value: 'standard_user',
              label: 'Standard User',
              desc: 'Search and download reports only',
              icon: UserCheck,
              color: 'border-sky-400 bg-sky-50 text-sky-800',
              check: 'bg-sky-500',
            },
          ].map(opt => {
            const Icon = opt.icon
            const active = form.role === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => set('role', opt.value)}
                className={`relative p-3 rounded-xl border-2 text-left transition-all ${
                  active ? opt.color + ' shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                {active && (
                  <span className={`absolute top-2 right-2 w-4 h-4 rounded-full ${opt.check} flex items-center justify-center`}>
                    <CheckCircle size={10} className="text-white" />
                  </span>
                )}
                <Icon size={18} className={`mb-1.5 ${active ? '' : 'text-gray-400'}`} />
                <p className="text-xs font-bold">{opt.label}</p>
                <p className="text-xs opacity-75 mt-0.5 leading-tight">{opt.desc}</p>
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Input label="Full Name" required placeholder="e.g. Tendai Moyo" value={form.full_name}
            onChange={e => set('full_name', e.target.value)} error={errors.full_name} />
          <Input label="Email Address" required type="email" placeholder="admin@company.co.zw"
            value={form.email} onChange={e => set('email', e.target.value)} error={errors.email} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Mobile" placeholder="+263 77 000 0000" value={form.mobile}
              onChange={e => set('mobile', e.target.value)} />
            <Input label="Office Phone" placeholder="+263 242 000 000" value={form.phone}
              onChange={e => set('phone', e.target.value)} />
          </div>
          <div className="relative">
            <Input label="Password" required type={showPw ? 'text' : 'password'}
              placeholder="Min. 8 characters" value={form.password}
              onChange={e => set('password', e.target.value)} error={errors.password} />
            <button type="button" onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-8 text-gray-400 hover:text-gray-600">
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <Input label="Confirm Password" required type="password" placeholder="Repeat password"
            value={form.confirm_password} onChange={e => set('confirm_password', e.target.value)}
            error={errors.confirm_password} />
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={mutation.isPending}>Create Admin</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Admin User Row ───────────────────────────────────────────────────────────

function AdminRow({ user, subscriberId, onToggle }) {
  const isMainAdmin = user.role === 'admin'

  const mutation = useMutation({
    mutationFn: () => subscribersAPI.toggleAdmin(subscriberId, user.id),
    onSuccess: (res) => {
      toast.success(res.data?.message || 'User status updated')
      onToggle()
    },
    onError: () => toast.error('Failed to update user status'),
  })

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
      user.is_active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-70'
    }`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
        isMainAdmin ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'
      }`}>
        {user.full_name?.[0]?.toUpperCase() || 'U'}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-800">{user.full_name}</p>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
            isMainAdmin
              ? 'bg-amber-50 text-amber-700 border border-amber-200'
              : 'bg-sky-50 text-sky-700 border border-sky-200'
          }`}>
            {isMainAdmin ? <Star size={9} /> : <UserCheck size={9} />}
            {isMainAdmin ? 'Main Admin' : 'Standard User'}
          </span>
          {!user.is_active && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
              Inactive
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Mail size={10} /> {user.email}
          </span>
          {(user.mobile || user.phone) && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Phone size={10} /> {user.mobile || user.phone}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">Added {formatDate(user.created_at)}</p>
      </div>

      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        title={user.is_active ? 'Deactivate user' : 'Activate user'}
        className={`p-1.5 rounded-lg transition-all ${
          user.is_active ? 'text-emerald-500 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-100'
        }`}
      >
        {mutation.isPending ? <Spinner size="sm" />
          : user.is_active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
      </button>
    </div>
  )
}

// ── Stat Card (optionally clickable) ─────────────────────────────────────────
// NOTE: intentionally uses a plain <div> instead of the <Card> component so
// that onClick is forwarded correctly — Card does not spread extra props.

function StatCard({ label, value, sub, icon: Icon, color, onClick }) {
  const clickable = !!onClick
  return (
    <div
      onClick={onClick}
      className={[
        'bg-white rounded-xl shadow-sm border border-gray-100 p-4 transition-all select-none',
        clickable
          ? 'cursor-pointer hover:shadow-md hover:border-gray-200 hover:scale-[1.01] active:scale-[0.99] group'
          : '',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-800 mt-0.5">{value}</p>
          {sub && (
            <p className={`text-xs mt-0.5 ${clickable ? 'text-[#1a3a5c] font-medium' : 'text-gray-400'}`}>
              {sub}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
            <Icon size={16} />
          </div>
          {clickable && (
            <span className="text-xs text-[#1a3a5c] font-medium flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              View <ChevronRight size={11} />
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function SubscriberDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showAddAdmin,  setShowAddAdmin]  = useState(false)
  const [showSearches,  setShowSearches]  = useState(false)

  const now = new Date()

  const { data: sub, isLoading, error } = useQuery({
    queryKey: ['subscriber', id],
    queryFn: () => subscribersAPI.get(id),
    select: r => r.data,
  })

  const invalidate = () => qc.invalidateQueries(['subscriber', id])

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <Spinner size="lg" />
    </div>
  )

  if (error || !sub) return (
    <div className="p-8 text-center">
      <p className="text-red-600 mb-4">Subscriber not found or failed to load.</p>
      <Button variant="secondary" onClick={() => navigate('/admin/subscribers')}>
        ← Back to Subscribers
      </Button>
    </div>
  )

  const users         = sub.users ?? []
  const mainAdmins    = users.filter(u => u.role === 'admin')
  const standardUsers = users.filter(u => u.role === 'read_only')
  const currentMonthName = MONTH_NAMES[now.getMonth()]

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* Back + header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin/subscribers')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors"
        >
          <ArrowLeft size={15} />
          Back to Subscribers
        </button>

        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#1a3a5c]/10 flex items-center justify-center shrink-0">
              <Building2 size={26} className="text-[#1a3a5c]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{sub.name}</h1>
              {sub.trading_name && sub.trading_name !== sub.name && (
                <p className="text-sm text-gray-500">Trading as: <em>{sub.trading_name}</em></p>
              )}
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <SubStatusBadge status={sub.status} />
                {sub.industry && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Briefcase size={11} /> {sub.industry}
                  </span>
                )}
                <span className="text-xs text-gray-400">Member since {formatDate(sub.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard label="Total Users"    value={users.length}                          icon={Users}       color="text-[#1a3a5c] bg-[#1a3a5c]/10" />
        <StatCard label="Main Admins"    value={mainAdmins.length}                     icon={Star}        color="text-amber-600 bg-amber-100" />
        <StatCard label="Standard Users" value={standardUsers.length}                  icon={UserCheck}   color="text-sky-600 bg-sky-100" />
        <StatCard label="Active Users"   value={users.filter(u => u.is_active).length} icon={CheckCircle} color="text-emerald-600 bg-emerald-100" />
        <StatCard
          label={`${currentMonthName} Searches`}
          value={sub.searches_this_month ?? sub.total_searches ?? '—'}
          sub="Click to view details"
          icon={Search}
          color="text-violet-600 bg-violet-100"
          onClick={() => setShowSearches(true)}
        />
        <StatCard
          label={`${currentMonthName} Cost`}
          value={sub.amount_owed != null ? `$${sub.amount_owed.toFixed(2)}` : '—'}
          sub="Click to view details"
          icon={DollarSign}
          color="text-emerald-600 bg-emerald-100"
          onClick={() => setShowSearches(true)}
        />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* LEFT — company info */}
        <div className="lg:col-span-2 space-y-4">

          {/* Company Information */}
          <Card className="overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-[#1a3a5c]/10 flex items-center justify-center">
                <Building2 size={14} className="text-[#1a3a5c]" />
              </div>
              <span className="font-semibold text-gray-800 text-sm">Company Information</span>
            </div>
            <div className="px-5 py-4 space-y-0">
              <InfoRow icon={Hash}      label="Registration No."  value={sub.registration_number} mono />
              <InfoRow icon={Briefcase} label="Industry"          value={sub.industry} />
              <InfoRow icon={MapPin}    label="Physical Address"  value={sub.physical_address || sub.address} />
              <InfoRow icon={MapPin}    label="Postal Address"    value={sub.postal_address} />
              <InfoRow icon={Globe}     label="City"              value={sub.city} />
              {!sub.registration_number && !sub.industry && !sub.physical_address && !sub.address && (
                <p className="text-xs text-gray-400 py-2">No company details recorded.</p>
              )}
            </div>
          </Card>

          {/* Contact Details */}
          <Card className="overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-[#1a3a5c]/10 flex items-center justify-center">
                <Phone size={14} className="text-[#1a3a5c]" />
              </div>
              <span className="font-semibold text-gray-800 text-sm">Contact Details</span>
            </div>
            <div className="px-5 py-4 space-y-0">
              <InfoRow icon={Mail}  label="Email"           value={sub.contact_email || sub.email} />
              <InfoRow icon={Phone} label="Main Phone"      value={sub.contact_phone || sub.phone} />
              <InfoRow icon={Phone} label="Secondary Phone" value={sub.contact_phone2 || sub.mobile} />
              <InfoRow icon={Globe} label="Website"         value={sub.website} />
            </div>
          </Card>

          {/* Primary Contact Person — only if present */}
          {(sub.contact_person_name || sub.contact_person_email) && (
            <Card className="overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-[#1a3a5c]/10 flex items-center justify-center">
                  <User size={14} className="text-[#1a3a5c]" />
                </div>
                <span className="font-semibold text-gray-800 text-sm">Primary Contact Person</span>
              </div>
              <div className="px-5 py-4 space-y-0">
                <InfoRow icon={User}      label="Name"            value={sub.contact_person_name} />
                <InfoRow icon={Briefcase} label="Title / Position" value={sub.contact_person_title} />
                <InfoRow icon={Phone}     label="Phone"           value={sub.contact_person_phone} />
                <InfoRow icon={Mail}      label="Email"           value={sub.contact_person_email} />
              </div>
            </Card>
          )}

          {/* Regulatory — collapsed by default */}
          <SectionCard title="Regulatory & Licensing" icon={Shield} defaultOpen={false}>
            <div className="pt-2 space-y-0">
              <InfoRow icon={FileText}  label="License Number"    value={sub.license_number} mono />
              <InfoRow icon={Shield}    label="Regulator"         value={sub.regulator} />
              <InfoRow icon={Calendar}  label="License Expiry"    value={formatDate(sub.license_expiry)} />
              <InfoRow icon={FileText}  label="Subscription Plan" value={sub.subscription_plan} />
            </div>
            {!sub.license_number && !sub.regulator && (
              <p className="text-xs text-gray-400 pt-3">No regulatory details recorded.</p>
            )}
          </SectionCard>

          {/* Account Metrics */}
          <Card className="overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-[#1a3a5c]/10 flex items-center justify-center">
                  <TrendingUp size={14} className="text-[#1a3a5c]" />
                </div>
                <span className="font-semibold text-gray-800 text-sm">Account Metrics</span>
              </div>
              <button
                onClick={() => setShowSearches(true)}
                className="text-xs text-[#1a3a5c] hover:underline flex items-center gap-1 font-medium"
              >
                View searches <ExternalLink size={11} />
              </button>
            </div>
            <div className="px-5 py-4">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-xl bg-violet-50 border border-violet-100 p-3 cursor-pointer hover:bg-violet-100/60 transition-colors" onClick={() => setShowSearches(true)}>
                  <p className="text-xs text-violet-600 font-medium">This Month</p>
                  <p className="text-xl font-bold text-gray-800 mt-0.5">
                    {sub.searches_this_month ?? sub.total_searches ?? '—'}
                  </p>
                  <p className="text-xs text-violet-500 mt-0.5">searches</p>
                </div>
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 cursor-pointer hover:bg-emerald-100/60 transition-colors" onClick={() => setShowSearches(true)}>
                  <p className="text-xs text-emerald-600 font-medium">Amount Owed</p>
                  <p className="text-xl font-bold text-gray-800 mt-0.5">
                    {sub.amount_owed != null ? `$${sub.amount_owed.toFixed(2)}` : '—'}
                  </p>
                  <p className="text-xs text-emerald-500 mt-0.5">this month</p>
                </div>
              </div>
              <div className="space-y-0">
                <InfoRow icon={Hash}     label="Max Searches / Month" value={sub.max_searches_per_month} />
                <InfoRow icon={Calendar} label="Last Updated"          value={formatDateTime(sub.updated_at)} />
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT — Admins & Users */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-[#1a3a5c]/10 flex items-center justify-center">
                  <Users size={14} className="text-[#1a3a5c]" />
                </div>
                <span className="font-semibold text-gray-800 text-sm">Admin Users</span>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {users.length} total
                </span>
              </div>
              <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowAddAdmin(true)}>
                Add Admin
              </Button>
            </div>

            <div className="p-5">
              <div className="flex gap-4 mb-4 p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="w-5 h-5 rounded-md bg-amber-100 flex items-center justify-center">
                    <Star size={10} className="text-amber-600" />
                  </span>
                  <strong>Main Admin</strong> — can add admins, search & download
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="w-5 h-5 rounded-md bg-sky-100 flex items-center justify-center">
                    <UserCheck size={10} className="text-sky-600" />
                  </span>
                  <strong>Standard</strong> — search & download only
                </div>
              </div>

              {users.length === 0 ? (
                <div className="text-center py-10">
                  <Users size={36} className="text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 font-medium">No admin users yet</p>
                  <p className="text-xs text-gray-400 mt-1 mb-4">Add an admin to give this subscriber access.</p>
                  <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowAddAdmin(true)}>
                    Add First Admin
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {mainAdmins.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                        Main Admins ({mainAdmins.length})
                      </p>
                      <div className="space-y-2">
                        {mainAdmins.map(u => (
                          <AdminRow key={u.id} user={u} subscriberId={id} onToggle={invalidate} />
                        ))}
                      </div>
                    </div>
                  )}
                  {standardUsers.length > 0 && (
                    <div className={mainAdmins.length > 0 ? 'pt-3 border-t border-gray-100' : ''}>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                        Standard Users ({standardUsers.length})
                      </p>
                      <div className="space-y-2">
                        {standardUsers.map(u => (
                          <AdminRow key={u.id} user={u} subscriberId={id} onToggle={invalidate} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <AddAdminModal
        open={showAddAdmin}
        onClose={() => setShowAddAdmin(false)}
        subscriberId={id}
        onSuccess={invalidate}
      />

      <SearchesDrawer
        open={showSearches}
        onClose={() => setShowSearches(false)}
        subscriberId={id}
        subscriberName={sub.name}
        initialMonth={now.getMonth() + 1}
        initialYear={now.getFullYear()}
      />
    </div>
  )
}