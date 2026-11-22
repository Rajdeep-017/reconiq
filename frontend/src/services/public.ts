import { api } from '@/lib/api'
import type { PublicOverview } from '@/types/landing'

/**
 * Public, unauthenticated landing-page data. The backend controls the demo
 * dataset and labels it explicitly; the frontend never invents business values.
 */
export const publicService = {
  overview: async (): Promise<PublicOverview> => {
    const res = await api.client.get<PublicOverview>('/public/overview')
    return res.data
  },
}
