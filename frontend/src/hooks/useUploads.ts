import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { UploadResponse, UploadListResponse } from '@/types'
import { ACTIVE_UPLOAD_STATUSES } from '@/types'
import { invalidateFinancialData } from '@/lib/invalidation'

interface UploadListParams {
  page?: number
  pageSize?: number
}

const uploadsQueryKey = (page: number, pageSize: number) => ['uploads', page, pageSize] as const

export function useUploads({ page = 1, pageSize = 50 }: UploadListParams = {}) {
  return useQuery({
    queryKey: uploadsQueryKey(page, pageSize),
    queryFn: async (): Promise<UploadListResponse> => {
      const res = await api.client.get<UploadListResponse>('/uploads', {
        params: { page, page_size: pageSize },
      })
      return res.data
    },
    // Poll while any upload is still moving through the pipeline server-side.
    refetchInterval: (query) => {
      const list = query.state.data as UploadListResponse | undefined
      const hasActive = list?.uploads.some(
        (u) => (ACTIVE_UPLOAD_STATUSES as string[]).includes(u.status)
      )
      return hasActive ? 3000 : false
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
    refetchInterval: (query) => {
      const upload = query.state.data as UploadResponse | undefined
      if (!upload) return false
      const stillActive = (ACTIVE_UPLOAD_STATUSES as string[]).includes(upload.status)
      return stillActive ? 2000 : false
    },
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
      if (data.partner_id) formData.append('partner_id', data.partner_id)
      const res = await api.client.post<UploadResponse>('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return res.data
    },
    onSuccess: () => invalidateFinancialData(queryClient),
  })
}

/**
 * Re-run deterministic normalization (retry after a failure, or process an
 * upload whose approved mapping could not be processed earlier).
 */
export function useProcessUpload() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (uploadId: string): Promise<UploadResponse> => {
      const res = await api.client.post<UploadResponse>(`/uploads/${uploadId}/process`)
      return res.data
    },
    onSuccess: () => invalidateFinancialData(queryClient),
  })
}
