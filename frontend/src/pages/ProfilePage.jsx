import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { usersAPI, authAPI } from '../api'
import useAuthStore from '../store/authStore'
import { PageHeader, Card, CardHeader, Input, Button, Alert } from '../components/ui'
import { useState } from 'react'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore()
  const [pwError, setPwError] = useState('')
  const { register, handleSubmit } = useForm({ defaultValues: user })
  const { register: regPw, handleSubmit: handlePw, reset: resetPw } = useForm()

  const profileMutation = useMutation({
    mutationFn: (data) => usersAPI.updateProfile(data),
    onSuccess: (res) => { updateUser(res.data); toast.success('Profile updated') },
  })

  const pwMutation = useMutation({
    mutationFn: (data) => authAPI.changePassword(data),
    onSuccess: () => { toast.success('Password changed'); resetPw() },
    onError: (err) => setPwError(err.response?.data?.detail || 'Failed'),
  })

  return (
    <div>
      <PageHeader title="My Profile" subtitle="Manage your account details" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Profile Details" />
          <form onSubmit={handleSubmit(d => profileMutation.mutate(d))} className="p-6 space-y-4">
            <Input label="Full Name" {...register('full_name')} />
            <Input label="Email" type="email" {...register('email')} />
            <Input label="Mobile" {...register('mobile')} />
            <Input label="Phone" {...register('phone')} />
            <Input label="Branch" {...register('branch')} />
            <Button type="submit" loading={profileMutation.isPending}>Save Changes</Button>
          </form>
        </Card>

        <Card>
          <CardHeader title="Change Password" />
          <form onSubmit={handlePw(d => { setPwError(''); pwMutation.mutate(d) })} className="p-6 space-y-4">
            {pwError && <Alert type="error">{pwError}</Alert>}
            <Input label="Current Password" type="password" {...regPw('old_password', { required: true })} />
            <Input label="New Password" type="password" {...regPw('new_password', { required: true, minLength: 8 })} />
            <Button type="submit" loading={pwMutation.isPending}>Change Password</Button>
          </form>
        </Card>
      </div>
    </div>
  )
}