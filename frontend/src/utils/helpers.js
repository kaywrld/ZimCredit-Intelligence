export const STATUS_LABELS = {
  open: 'OPEN',
  good: 'GOOD',
  green: 'GREEN',
  adverse: 'ADVERSE',
  pep: 'PEP',
  fair: 'FAIR',
  inconclusive: 'INCONCLUSIVE',
  rejected: 'REJECTED',
  confirmation: 'CONFIRMATION',
  confirmed: 'CONFIRMED',
  incomplete: 'INCOMPLETE',
  processing: 'PROCESSING',
}

export const getStatusClass = (status) => {
  const map = {
    open: 'status-open',
    good: 'status-good',
    green: 'status-green',
    adverse: 'status-adverse',
    pep: 'status-pep',
    fair: 'status-fair',
    inconclusive: 'status-inconclusive',
    rejected: 'status-rejected',
    confirmation: 'status-confirmation',
    confirmed: 'status-confirmed',
    incomplete: 'status-incomplete',
    processing: 'status-processing',
  }
  return map[status] || 'status-inconclusive'
}

export const canPrintReport = (status) =>
  ['good', 'green', 'adverse', 'pep', 'fair'].includes(status)

export const getScoreBand = (score) => {
  if (!score) return { label: 'N/A', color: 'text-gray-500' }
  if (score >= 700) return { label: 'Low Risk', color: 'text-green-600' }
  if (score >= 500) return { label: 'Medium Risk', color: 'text-yellow-600' }
  if (score >= 300) return { label: 'High Risk', color: 'text-orange-600' }
  return { label: 'Very High Risk', color: 'text-red-600' }
}

export const formatDate = (date) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-ZW', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

export const formatDateTime = (date) => {
  if (!date) return '—'
  return new Date(date).toLocaleString('en-ZW', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export const ROLES = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  subscriber: 'Subscriber',
  read_only: 'Read Only',
}

export const isAdmin = (role) => ['admin', 'super_admin'].includes(role)
export const isSuperAdmin = (role) => role === 'super_admin'
