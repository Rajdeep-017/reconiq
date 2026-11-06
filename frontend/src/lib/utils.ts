import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrencyINR(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '₹0.00'
  }
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) {
    return '₹0.00'
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function truncate(str: string, length: number): string {
  if (!str) return ''
  if (str.length <= length) return str
  return str.slice(0, length) + '…'
}

export function getStatusColor(status: string): string {
  const s = status.toLowerCase()
  if (s.includes('completed') || s.includes('resolved') || s.includes('matched') || s.includes('approved') || s.includes('acknowledged') || s.includes('parsed') || s.includes('normalized')) {
    return 'bg-green-100 text-green-800 border-green-200'
  }
  if (s.includes('pending') || s.includes('uploaded') || s.includes('parsing') || s.includes('mapped') || s.includes('submitted') || s.includes('acknowledged') || s.includes('under_review') || s.includes('fuzzy')) {
    return 'bg-amber-100 text-amber-800 border-amber-200'
  }
  if (s.includes('failed') || s.includes('rejected') || s.includes('unmatched') || s.includes('error')) {
    return 'bg-red-100 text-red-800 border-red-200'
  }
  if (s.includes('running') || s.includes('processing')) {
    return 'bg-blue-100 text-blue-800 border-blue-200'
  }
  return 'bg-slate-100 text-slate-800 border-slate-200'
}

export function getConfidenceColor(confidence: number | string | null | undefined): string {
  if (confidence === null || confidence === undefined) return 'bg-slate-100 text-slate-800'
  const c = typeof confidence === 'string' ? parseFloat(confidence) : confidence
  if (isNaN(c)) return 'bg-slate-100 text-slate-800'
  if (c >= 0.8) return 'bg-green-100 text-green-800 border-green-200'
  if (c >= 0.5) return 'bg-amber-100 text-amber-800 border-amber-200'
  return 'bg-red-100 text-red-800 border-red-200'
}
