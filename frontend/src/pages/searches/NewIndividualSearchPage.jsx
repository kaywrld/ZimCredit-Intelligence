import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { individualSearchAPI } from '../../api'
import { PageHeader, Card, Button, Input, Select, Alert } from '../../components/ui'
import toast from 'react-hot-toast'

const PURPOSES = ['New Customer (KYC)','Existing Customer','Periodic Account Review',
  'Credit Application','Employment Vetting','Tenant Vetting','Business Partner','Other']

const steps = ['Personal Details', 'Contact Details', 'Loan Info']

export default function NewIndividualSearchPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const { register, handleSubmit, watch, trigger, formState: { errors } } = useForm()

  const mutation = useMutation({
    mutationFn: (data) => individualSearchAPI.create(data),
    onSuccess: (res) => {
      toast.success(`Search created: ${res.data.search_ref}`)
      navigate(`/searches/individuals/${res.data.id}`)
    },
    onError: (err) => {
      setError(err.response?.data?.detail || 'Failed to create search')
    }
  })

  const nextStep = async () => {
    const fields = step === 0
      ? ['search_purpose','first_name','last_name','nationality','gender','date_of_birth','marital_status']
      : ['address.street_name','address.city','address.mobile','address.property_density','address.property_ownership']
    const valid = await trigger(fields)
    if (valid) setStep(s => s + 1)
  }

  const onSubmit = (data) => {
    setError('')
    // Format date
    data.date_of_birth = new Date(data.date_of_birth).toISOString()
    mutation.mutate(data)
  }

  return (
    <div>
      <PageHeader title="New Individual Search" subtitle="Step-by-step credit search" />

      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-6">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
              ${i <= step ? 'bg-[#1a3a5c] text-white' : 'bg-gray-200 text-gray-500'}`}>
              {i + 1}
            </div>
            <span className={`text-sm ${i === step ? 'font-semibold text-gray-800' : 'text-gray-400'}`}>{s}</span>
            {i < steps.length - 1 && <div className={`w-8 h-0.5 ${i < step ? 'bg-[#1a3a5c]' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="p-6">
          {error && <Alert type="error" className="mb-4">{error}</Alert>}

          {/* Step 1 - Personal */}
          {step === 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700 mb-4">Personal Information</h3>
              <Select label="Search Purpose" required error={errors.search_purpose?.message}
                {...register('search_purpose', { required: 'Required' })}>
                <option value="">Select purpose...</option>
                {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
              </Select>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input label="First Name" required error={errors.first_name?.message}
                  {...register('first_name', { required: 'Required' })} />
                <Input label="Middle Name" {...register('middle_name')} />
                <Input label="Last Name" required error={errors.last_name?.message}
                  {...register('last_name', { required: 'Required' })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="National ID" placeholder="63-123456A-50"
                  {...register('national_id')} />
                <Input label="Passport Number" {...register('passport_number')} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select label="Nationality" required {...register('nationality', { required: 'Required' })}>
                  <option value="Zimbabwean">Zimbabwean</option>
                  <option value="South African">South African</option>
                  <option value="Zambian">Zambian</option>
                  <option value="Mozambican">Mozambican</option>
                  <option value="Other">Other</option>
                </Select>
                <Select label="Gender" required error={errors.gender?.message}
                  {...register('gender', { required: 'Required' })}>
                  <option value="">Select...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </Select>
                <Select label="Marital Status" required error={errors.marital_status?.message}
                  {...register('marital_status', { required: 'Required' })}>
                  <option value="">Select...</option>
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="divorced">Divorced</option>
                  <option value="widowed">Widowed</option>
                </Select>
              </div>
              <Input label="Date of Birth" type="date" required error={errors.date_of_birth?.message}
                {...register('date_of_birth', { required: 'Required' })} />
            </div>
          )}

          {/* Step 2 - Contact */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700 mb-4">Contact & Address Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input label="Street No" {...register('address.street_no')} />
                <Input label="Street Name" required error={errors.address?.street_name?.message}
                  className="md:col-span-2"
                  {...register('address.street_name', { required: 'Required' })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input label="Suburb" {...register('address.suburb')} />
                <Input label="City" required error={errors.address?.city?.message}
                  {...register('address.city', { required: 'Required' })} />
                <Input label="Country" defaultValue="Zimbabwe" {...register('address.country')} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select label="Property Density" required error={errors.address?.property_density?.message}
                  {...register('address.property_density', { required: 'Required' })}>
                  <option value="">Select...</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </Select>
                <Select label="Property Ownership" required error={errors.address?.property_ownership?.message}
                  {...register('address.property_ownership', { required: 'Required' })}>
                  <option value="">Select...</option>
                  <option value="Owned">Owned</option>
                  <option value="Rented">Rented</option>
                  <option value="Mortgaged">Mortgaged</option>
                  <option value="Other">Other</option>
                </Select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Mobile" required placeholder="0771234567"
                  error={errors.address?.mobile?.message}
                  {...register('address.mobile', { required: 'Required' })} />
                <Input label="Email" type="email" {...register('address.email')} />
              </div>
            </div>
          )}

          {/* Step 3 - Loan info */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-700 mb-4">Employment & Loan Details <span className="text-gray-400 font-normal text-sm">(Optional)</span></h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Employer" {...register('employer')} />
                <Input label="Occupation" {...register('occupation')} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select label="Salary Band (USD)" {...register('salary_band_usd')}>
                  <option value="">Select...</option>
                  <option value="0-200">$0 - $200</option>
                  <option value="201-500">$201 - $500</option>
                  <option value="501-1000">$501 - $1,000</option>
                  <option value="1001-2000">$1,001 - $2,000</option>
                  <option value="2000+">$2,000+</option>
                </Select>
                <Input label="Loan Amount (USD)" type="number" {...register('loan_amount')} />
              </div>
              <Select label="Loan Purpose" {...register('loan_purpose')}>
                <option value="">Select...</option>
                <option value="Personal Loan">Personal Loan</option>
                <option value="Business Loan">Business Loan</option>
                <option value="Mortgage">Mortgage</option>
                <option value="Vehicle Finance">Vehicle Finance</option>
                <option value="Current Account Overdraft">Current Account Overdraft</option>
                <option value="Revolving Credit">Revolving Credit</option>
              </Select>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between mt-8 pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={() => step === 0 ? navigate(-1) : setStep(s => s - 1)}>
              {step === 0 ? 'Cancel' : '← Back'}
            </Button>
            {step < steps.length - 1
              ? <Button onClick={nextStep}>Next →</Button>
              : <Button type="submit" loading={mutation.isPending}>Submit Search</Button>
            }
          </div>
        </Card>
      </form>
    </div>
  )
}