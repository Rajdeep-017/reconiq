import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { UploadResponse, UploadListResponse } from '@/types'

export function useUploads(page = 1, pageSize = 50) {
  return useQuery({
    queryKey: ['uploads', page, pageSize],
    queryFn: async (): Promise<UploadListResponse> => {
      const res = await api.client.get<UploadListResponse>('/uploads', {
        params: { page, page_size: pageSize },
      })
      return res.data
    },
  })
}

export function useUpload(uploadId: string) {
  return useQuery({
    queryKey: ['uploads', uploadId],
    queryFn: async (): Promise<UploadResponse> => {
      const res = await api.client.get<UploadResponse>(`/uploads/${uploadId}`)
      return res.data
    },
    enabled: !!uploadId,
  })
}

export function useUploadFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      file: File
      document_type: string
      partner_id?: string
    }) => {
      const formData = new FormData()
      formData.append('file', data.file)
      formData.append('document_type', data.document_type)
      if (data.partner_id) {
        formData.append('partner_id', data.partner_id)
      }
      const res = await api.client.post<UploadResponse>('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uploads'] })
    },
  })
}

export function usePartners() {
  return useQuery({
    queryKey: ['partners'],
    queryFn: async () => {
      const res = await api.client.get<{ partners: any[]; total: number }>('/partners')
      return res.data.partners
    },
  })
}
