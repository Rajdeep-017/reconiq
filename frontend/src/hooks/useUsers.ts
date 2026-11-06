import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userService } from '@/services/users'

export function useUsers(params?: { page?: number; page_size?: number }) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => userService.list(params),
  })
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { role: string } }) =>
      userService.updateRole(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useDeactivateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => userService.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}
