import { api } from '@/lib/api'

export interface UserResponse {
  id: string
  email: string
  full_name: string
  role: string
  org_id: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UserListResponse {
  users: UserResponse[]
  total: number
  page: number
  page_size: number
}

export interface UserUpdateRequest {
  full_name?: string
  email?: string
}

export interface UserRoleUpdateRequest {
  role: string
}

export const userService = {
  list: async (params?: {
    page?: number
    page_size?: number
  }): Promise<UserListResponse> => {
    const res = await api.client.get<UserListResponse>('/users', { params })
    return res.data
  },

  get: async (id: string): Promise<UserResponse> => {
    const res = await api.client.get<UserResponse>(`/users/${id}`)
    return res.data
  },

  updateProfile: async (data: UserUpdateRequest): Promise<UserResponse> => {
    const res = await api.client.patch<UserResponse>('/users/me', data)
    return res.data
  },

  updateRole: async (id: string, data: UserRoleUpdateRequest): Promise<UserResponse> => {
    const res = await api.client.patch<UserResponse>(`/users/${id}/role`, data)
    return res.data
  },

  deactivate: async (id: string): Promise<{ success: boolean }> => {
    const res = await api.client.delete<{ success: boolean }>(`/users/${id}`)
    return res.data
  },
}
