import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { individualSearchAPI } from '../../api'
import { PageHeader, Card, CardHeader, StatusBadge, ScoreDisplay, Button, Alert } from '../../components/ui'
import { formatDate, formatDateTime, canPrintReport, getScoreBand } from '../../utils/helpers'

export default function SearchDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: search, isLoading, error } = useQuery({
    queryKey: ['individual-search', id],
    queryFn: () => individualSearchAPI.get(id).then(r => r.data),
  })

  if (isLoading) return <div className="p-8 text-center text-gray-400">Loading search...</div>
  if (error) return <div className="p-8 text-center text-red-500">Search not found</div>

  const ind = search?.individual
  const band = getScoreBand(search?.credit_score)

  return (
    <div>
      <PageHeader
        title={search?.search_ref}
        subtitle={`Individual Credit Search · ${formatDateTime(search?.created_at)}`}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate(-1)}>← Back</Button>
            {canPrintReport(search?.status) &&
              <Button variant="success" icon="🖨️">Print Report</Button>}
          </div>
        }
      />

      {/* Status banner */}
      <div className="mb-6 p-4 bg-white rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <StatusBadge status={search?.status} />
          <div>
            <p className="text-sm text-gray-500">ZCI Status</p>
            <p className="text-xs text-gray-400">
              {search?.processed_at ? `Processed ${formatDate(search.processed_at)}` : 'Awaiting processing'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <ScoreDisplay score={search?.credit_score} />
          <p className={`text-xs font-medium ${band.color}`}>{band.label}</p>
        </div>
      </div>

      {/* Rejection reason */}
      {search?.status === 'rejected' && search?.rejection_reason && (
        <Alert type="error" className="mb-4">
          <strong>Rejected:</strong> {search.rejection_reason} — {search.rejection_comments}
        </Alert>
      )}

      {/* Confirmation needed */}
      {search?.status === 'confirmation' && (
        <Alert type="warning" className="mb-4">
          <strong>Confirmation Required:</strong> {search.confirmation_reason}
          <button className="ml-2 underline text-yellow-800 font-semibold">Respond now</button>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal details */}
        <Card>
          <CardHeader title="Personal Details" />
          <div className="p-6 space-y-3">
            {[
              ['Full Name', ind?.first_name + ' ' + (ind?.middle_name || '') + ' ' + ind?.last_name],
              ['National ID', ind?.national_id || '—'],
              ['Passport', ind?.passport_number || '—'],
              ['Nationality', ind?.nationality],
              ['Gender', ind?.gender],
              ['Date of Birth', formatDate(ind?.date_of_birth)],
              ['Marital Status', ind?.marital_status],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium text-gray-800 capitalize">{value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Search details */}
        <Card>
          <CardHeader title="Search Details" />
          <div className="p-6 space-y-3">
            {[
              ['Reference', search?.search_ref],
              ['Purpose', search?.search_purpose],
              ['Loan Purpose', search?.loan_purpose || '—'],
              ['Loan Amount', search?.loan_amount ? `$${search.loan_amount.toLocaleString()}` : '—'],
              ['Created', formatDateTime(search?.created_at)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium text-gray-800">{value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Address */}
        {ind?.addresses?.length > 0 && (
          <Card>
            <CardHeader title="Address" />
            <div className="p-6 space-y-3">
              {[
                ['Street', `${ind.addresses[0].street_no || ''} ${ind.addresses[0].street_name}`],
                ['Suburb', ind.addresses[0].suburb || '—'],
                ['City', ind.addresses[0].city],
                ['Country', ind.addresses[0].country],
                ['Mobile', ind.addresses[0].mobile || '—'],
                ['Property', ind.addresses[0].property_ownership || '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-medium text-gray-800">{value}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Employment */}
        {ind?.employment?.length > 0 && (
          <Card>
            <CardHeader title="Employment" />
            <div className="p-6 space-y-3">
              {[
                ['Employer', ind.employment[0].employer || '—'],
                ['Occupation', ind.employment[0].occupation || '—'],
                ['Industry', ind.employment[0].industry || '—'],
                ['Salary Band', ind.employment[0].salary_band_usd ? `$${ind.employment[0].salary_band_usd}` : '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-medium text-gray-800">{value}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}