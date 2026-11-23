import axios, { type AxiosInstance, type AxiosError } from 'axios'

export interface ApiErrorResponse {
  error?: boolean
  message?: string
  detail?: string | Array<{ msg?: string }>
  code?: string
  details?: Record<string, unknown>
}

export interface ApiSuccessResponse<T> {
  status: 'success'
  data: T
  message?: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

const env = (import.meta as any).env ?? {}
const configuredApiBaseUrl = env.VITE_API_BASE_URL
const API_BASE_URL = configuredApiBaseUrl
  ? /^https?:\/\/[^/]+\/?$/i.test(configuredApiBaseUrl)
    ? `${configuredApiBaseUrl.replace(/\/+$/, '')}/api/v1`
    : configuredApiBaseUrl
  : env.DEV
    ? 'http://localhost:8000/api/v1'
    : '/api/v1'

class ApiClient {
  public client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    })

    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('reconiq_token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiErrorResponse>) => {
        const requestUrl = error.config?.url ?? ''
        const isAuthenticationAttempt = /\/auth\/(?:login|register)(?:[?#]|$)/.test(
          requestUrl
        )
        if (error.response?.status === 401 && !isAuthenticationAttempt) {
          localStorage.removeItem('reconiq_token')
          localStorage.removeItem('reconiq_user')
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }
    )
  }

  setToken(token: string) {
    localStorage.setItem('reconiq_token', token)
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }

  clearToken() {
    localStorage.removeItem('reconiq_token')
    localStorage.removeItem('reconiq_user')
    delete this.client.defaults.headers.common['Authorization']
  }
}

export const api = new ApiClient()

export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data
    if (typeof data?.message === 'string') return data.message
    if (typeof data?.detail === 'string') return data.detail
    if (Array.isArray(data?.detail)) {
      const messages = data.detail
        .map((issue: { msg?: string }) => issue.msg)
        .filter(
          (message: string | undefined): message is string =>
            typeof message === 'string' && message.length > 0
        )
      if (messages.length > 0) return messages.join('; ')
    }
    if (error.code === 'ERR_NETWORK') {
      return 'Unable to reach the server. Check your connection and try again.'
    }
    return error.message || 'An unexpected error occurred'
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'An unexpected error occurred'
}
