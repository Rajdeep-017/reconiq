import { useState, useCallback, useEffect } from 'react'
import { api, TokenResponse } from '@/lib/api'
import type { User, RegisterRequest, LoginRequest } from '@/types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem('reconiq_user')
    const token = localStorage.getItem('reconiq_token')
    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser))
        api.setToken(token)
      } catch {
        localStorage.removeItem('reconiq_user')
        localStorage.removeItem('reconiq_token')
      }
    }
    setLoading(false)
  }, [])

  const login = async (data: LoginRequest): Promise<TokenResponse> => {
    const res = await api.client.post<TokenResponse>('/auth/login', data)
    const token = res.data.access_token
    api.setToken(token)
    const userData = await me()
    localStorage.setItem('reconiq_user', JSON.stringify(userData))
    setUser(userData)
    return res.data
  }

  const register = async (data: RegisterRequest): Promise<User> => {
    const res = await api.client.post<User>('/auth/register', data)
    return res.data
  }

  const me = async (): Promise<User> => {
    const res = await api.client.get<User>('/auth/me')
    return res.data
  }

  const logout = useCallback(() => {
    api.clearToken()
    setUser(null)
    window.location.href = '/login'
  }, [])

  return {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    me,
    logout,
  }
}
