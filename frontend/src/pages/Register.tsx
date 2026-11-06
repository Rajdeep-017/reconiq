'use client'

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { ShieldCheck, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.string(),
})

export function Register() {
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { register } = useAuth()

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', full_name: '', password: '', role: 'finance_executive' },
  })

  const onSubmit = async (values: z.infer<typeof registerSchema>) => {
    setError(null)
    try {
      await register(values as any)
      toast.success('Account created. You can now sign in.')
      navigate('/login')
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.detail || 'Registration failed. Please try again.'
      setError(msg)
      toast.error(msg)
    }
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-muted/50">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-600 text-white">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight">Create account</h2>
          <p className="text-sm text-muted-foreground">
            Join ReconIQ to start reconciling your marketplace finances
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Get started</CardTitle>
            <CardDescription>
              Fill in your details to create your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@company.com"
                  {...form.register('email')}
                  className={cn(
                    'w-full',
                    form.formState.errors.email && 'border-destructive'
                  )}
                />
                {form.formState.errors.email && (
                  <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_name">Full name</Label>
                <Input
                  id="full_name"
                  type="text"
                  placeholder="John Doe"
                  {...form.register('full_name')}
                  className={cn(
                    'w-full',
                    form.formState.errors.full_name && 'border-destructive'
                  )}
                />
                {form.formState.errors.full_name && (
                  <p className="text-xs text-destructive">{form.formState.errors.full_name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  {...form.register('password')}
                  className={cn(
                    'w-full',
                    form.formState.errors.password && 'border-destructive'
                  )}
                />
                {form.formState.errors.password && (
                  <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  {...form.register('role')}
                  defaultValue="finance_executive"
                >
                  <Select.Trigger className="w-[220px]">
                    <Select.Value placeholder="Select role" />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="finance_executive">Finance Executive</Select.Item>
                    <Select.Item value="finance_cofounder">Finance Cofounder</Select.Item>
                  </Select.Content>
                </Select>
                {form.formState.errors.role && (
                  <p className="text-xs text-destructive">{form.formState.errors.role.message}</p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
              >
                <span className="flex items-center justify-center gap-2">
                  Create account <ArrowRight className="h-4 w-4" />
                </span>
              </Button>
            </form>
          </CardContent>
          <CardFooter>
            <p className="text-sm text-center text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
