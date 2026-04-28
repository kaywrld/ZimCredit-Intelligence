import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Building2, Plus, Search, ChevronRight, Users,
  Activity, Phone, Mail, Globe, CheckCircle,
  Clock, XCircle, AlertCircle, MapPin, FileText, Shield
} from 'lucide-react'
import { subscribersAPI } from '../../api/index'
import {
  Button, Modal, Input, Select, Spinner, PageHeader, Card
} from '../../components/ui/index'
import { formatDate } from '../../utils/helpers'

// ── Status helpers ──────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  active:    { label: 'Active',    icon: CheckCircle, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pending:   { label: 'Pending',   icon: Clock,       cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  suspended: { label: 'Suspended', icon: XCircle,     cls: 'bg-red-50 text-red-700 border-red-200' },
  inactive:  { label: 'Inactive',  icon: AlertCircle, cls: 'bg-gray-50 text-gray-600 border-gray-200' },
}

function SubscriberStatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.inactive
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  )
}

// ── Industry options ────────────────────────────────────────────────────────
const INDUSTRIES = [
  'Banking', 'Microfinance', 'Insurance', 'Building Society',
  'Asset Management', 'Securities', 'Pension Fund', 'Mobile Money',
  'Retail Credit', 'Leasing', 'Other Financial Services',
]

// ── Add Subscriber Form ─────────────────────────────────────────────────────
const INITIAL_FORM = {
  // Company
  name: '', registration_number: '', industry: '',
  // Contact
  contact_email: '', contact_phone: '', contact_phone2: '', website: '',
  // Addresses
  physical_address: '', postal_address: '',
  // Primary contact person
  contact_person_name: '', contact_person_title: '',
  contact_person_phone: '', contact_person_email: '',
  // Regulatory
  license_number: '', regulator: '', license_expiry: '',
}

function AddSubscriberModal({ open, onClose, onSuccess }) {
  const [form, setForm] = useState(INITIAL_FORM)
  const [errors, setErrors] = useState({})
  const [step, setStep] = useState(1) // 1=Company Info, 2=Contact, 3=Regulatory

  const set = (field, value) => {
    setForm(f => ({ ...f, [field]: value }))
    if (errors[field]) setErrors(e => ({ ...e, [field]: '' }))
  }

  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Company name is required'
    if (!form.contact_email.trim()) errs.contact_email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email))
      errs.contact_email = 'Invalid email address'
    if (!form.contact_phone.trim()) errs.contact_phone = 'Phone number is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const mutation = useMutation({
    mutationFn: (data) => subscribersAPI.create(data),
    onSuccess: (res) => {
      toast.success('Subscriber added successfully!')
      onSuccess(res.data)
      setForm(INITIAL_FORM)
      setStep(1)
      onClose()
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to add subscriber')
    },
  })

  const handleSubmit = () => {
    if (!validate()) { setStep(1); return }
    const payload = { ...form }
    if (!payload.license_expiry) delete payload.license_expiry
    mutation.mutate(payload)
  }

  const handleClose = () => {
    setForm(INITIAL_FORM); setStep(1); setErrors({}); onClose()
  }

  const steps = [
    { n: 1, label: 'Company Info' },
    { n: 2, label: 'Contact Details' },
    { n: 3, label: 'Regulatory' },
  ]

  return (
    <Modal open={open} onClose={handleClose} title="Add New Subscriber" size="xl">
      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-6 -mx-6 px-6 pb-5 border-b border-gray-100">
        {steps.map((s, i) => (
          <div key={s.n} className="flex items-center flex-1">
            <button
              onClick={() => setStep(s.n)}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                step === s.n ? 'text-[#1a3a5c]' : step > s.n ? 'text-emerald-600' : 'text-gray-400'
              }`}
            >
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                step === s.n ? 'border-[#1a3a5c] bg-[#1a3a5c] text-white'
                  : step > s.n ? 'border-emerald-500 bg-emerald-500 text-white'
                  : 'border-gray-300 text-gray-400'
              }`}>
                {step > s.n ? '✓' : s.n}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 ${step > s.n ? 'bg-emerald-400' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1 — Company Information */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Building2 size={16} className="text-[#1a3a5c]" />
            <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Company Information</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Company Name" required
              placeholder="e.g. First National Bank Zimbabwe"
              value={form.name} onChange={e => set('name', e.target.value)}
              error={errors.name}
              className="sm:col-span-2"
            />
            <Input
              label="Registration Number"
              placeholder="e.g. 1234/2005"
              value={form.registration_number}
              onChange={e => set('registration_number', e.target.value)}
            />
            <Select
              label="Industry"
              value={form.industry}
              onChange={e => set('industry', e.target.value)}
            >
              <option value="">Select industry…</option>
              {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
            </Select>
            <Input
              label="Physical Address"
              placeholder="Street address"
              value={form.physical_address}
              onChange={e => set('physical_address', e.target.value)}
              className="sm:col-span-2"
            />
            <Input
              label="Postal Address"
              placeholder="P.O. Box / postal address"
              value={form.postal_address}
              onChange={e => set('postal_address', e.target.value)}
              className="sm:col-span-2"
            />
          </div>
        </div>
      )}

      {/* Step 2 — Contact Details */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Phone size={16} className="text-[#1a3a5c]" />
            <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Contact Details</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Contact Email" required type="email"
              placeholder="company@example.com"
              value={form.contact_email}
              onChange={e => set('contact_email', e.target.value)}
              error={errors.contact_email}
            />
            <Input
              label="Website"
              placeholder="https://www.example.co.zw"
              value={form.website}
              onChange={e => set('website', e.target.value)}
            />
            <Input
              label="Main Phone" required
              placeholder="+263 242 000 000"
              value={form.contact_phone}
              onChange={e => set('contact_phone', e.target.value)}
              error={errors.contact_phone}
            />
            <Input
              label="Secondary Phone"
              placeholder="+263 77 000 0000"
              value={form.contact_phone2}
              onChange={e => set('contact_phone2', e.target.value)}
            />
          </div>

          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Users size={16} className="text-[#1a3a5c]" />
              <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Primary Contact Person</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                placeholder="e.g. John Doe"
                value={form.contact_person_name}
                onChange={e => set('contact_person_name', e.target.value)}
              />
              <Input
                label="Title / Position"
                placeholder="e.g. Chief Operations Officer"
                value={form.contact_person_title}
                onChange={e => set('contact_person_title', e.target.value)}
              />
              <Input
                label="Direct Phone"
                placeholder="+263 77 000 0000"
                value={form.contact_person_phone}
                onChange={e => set('contact_person_phone', e.target.value)}
              />
              <Input
                label="Direct Email"
                type="email"
                placeholder="contact@example.co.zw"
                value={form.contact_person_email}
                onChange={e => set('contact_person_email', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 3 — Regulatory */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={16} className="text-[#1a3a5c]" />
            <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Regulatory & Licensing</h4>
          </div>
          <p className="text-xs text-gray-500 -mt-2 mb-3">
            These fields are optional but recommended for financial institution compliance.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="License Number"
              placeholder="e.g. RBZLIC-2024-001"
              value={form.license_number}
              onChange={e => set('license_number', e.target.value)}
            />
            <Input
              label="Regulator"
              placeholder="e.g. Reserve Bank of Zimbabwe"
              value={form.regulator}
              onChange={e => set('regulator', e.target.value)}
            />
            <Input
              label="License Expiry Date"
              type="date"
              value={form.license_expiry}
              onChange={e => set('license_expiry', e.target.value)}
            />
          </div>

          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700 font-medium mb-1">Review Before Submitting</p>
            <p className="text-xs text-blue-600">
              <strong>Company:</strong> {form.name || '—'}<br />
              <strong>Email:</strong> {form.contact_email || '—'}<br />
              <strong>Phone:</strong> {form.contact_phone || '—'}<br />
              <strong>Industry:</strong> {form.industry || '—'}
            </p>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between mt-6 pt-4 border-t border-gray-100">
        <Button
          variant="secondary"
          onClick={step === 1 ? handleClose : () => setStep(s => s - 1)}
        >
          {step === 1 ? 'Cancel' : '← Back'}
        </Button>
        {step < 3 ? (
          <Button onClick={() => setStep(s => s + 1)}>
            Next →
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            loading={mutation.isPending}
            variant="primary"
          >
            Create Subscriber
          </Button>
        )}
      </div>
    </Modal>
  )
}

// ── Main SubscribersPage ────────────────────────────────────────────────────
export default function SubscribersPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['subscribers', search, statusFilter],
    queryFn: () => subscribersAPI.list({ search, status: statusFilter || undefined }),
    select: r => r.data,
  })

  // API returns { subscribers: [...], total: N }
  const subscribers = data?.subscribers ?? (Array.isArray(data) ? data : [])

  const handleAddSuccess = () => {
    qc.invalidateQueries(['subscribers'])
  }

  if (error) return (
    <div className="p-8 text-center text-red-600">
      Failed to load subscribers. Please try again.
    </div>
  )

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Subscribers"
        subtitle={`${subscribers.length} registered subscriber${subscribers.length !== 1 ? 's' : ''}`}
        action={
          <Button
            onClick={() => setShowAdd(true)}
            icon={<Plus size={16} />}
          >
            Add Subscriber
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a3a5c] focus:border-transparent"
            placeholder="Search by name, email, industry…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1a3a5c] bg-white"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <Card>
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Spinner size="lg" />
          </div>
        ) : subscribers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Building2 size={48} className="text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-1">No subscribers yet</h3>
            <p className="text-sm text-gray-400 mb-4">
              {search || statusFilter ? 'No results match your filters.' : 'Add your first subscriber to get started.'}
            </p>
            {!search && !statusFilter && (
              <Button onClick={() => setShowAdd(true)} icon={<Plus size={16} />}>
                Add First Subscriber
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Company</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Industry</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Contact</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Admins</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Joined</th>
                  <th className="px-4 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {subscribers.map(sub => (
                  <tr
                    key={sub.id}
                    onClick={() => navigate(`/admin/subscribers/${sub.id}`)}
                    className="hover:bg-sky-50/40 cursor-pointer group transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#1a3a5c]/10 flex items-center justify-center shrink-0">
                          <Building2 size={16} className="text-[#1a3a5c]" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800 group-hover:text-[#1a3a5c] transition-colors">
                            {sub.name}
                          </p>
                          {sub.trading_name && sub.trading_name !== sub.name && (
                            <p className="text-xs text-gray-400">{sub.trading_name}</p>
                          )}
                          {sub.registration_number && (
                            <p className="text-xs text-gray-400">Reg: {sub.registration_number}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <span className="text-sm text-gray-600">{sub.industry || '—'}</span>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <div className="space-y-0.5">
                        {(sub.contact_email || sub.email) && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Mail size={11} />
                            <span className="truncate max-w-40">{sub.contact_email || sub.email}</span>
                          </div>
                        )}
                        {(sub.contact_phone || sub.phone) && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Phone size={11} />
                            <span>{sub.contact_phone || sub.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <div className="flex items-center gap-1.5">
                        <Users size={13} className="text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {sub.user_count ?? sub.users?.length ?? '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <SubscriberStatusBadge status={sub.status} />
                    </td>
                    <td className="px-4 py-4 hidden sm:table-cell">
                      <span className="text-xs text-gray-400">{formatDate(sub.created_at)}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <ChevronRight size={16} className="text-gray-300 group-hover:text-sky-500 transition-colors inline" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AddSubscriberModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSuccess={handleAddSuccess}
      />
    </div>
  )
}