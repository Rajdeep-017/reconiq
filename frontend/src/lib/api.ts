import axios, { type AxiosInstance, type AxiosError } from 'axios'

export interface ApiErrorResponse {
  status: 'error'
  detail: string
  code: string
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

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

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
        if (error.response?.status === 401) {
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
    return error.response?.data?.detail || error.message || 'An unexpected error occurred'
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'An unexpected error occurred'
}
