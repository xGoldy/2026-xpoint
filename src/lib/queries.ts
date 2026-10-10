import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchAllSkills, fetchCategories, fetchLocalities } from './api'

export const useLocalities = () =>
  useQuery({ queryKey: ['localities'], queryFn: fetchLocalities, staleTime: Infinity })

export const useCategories = () =>
  useQuery({ queryKey: ['categories'], queryFn: fetchCategories, staleTime: Infinity })

export const useAllSkills = () => useQuery({ queryKey: ['skills', 'all'], queryFn: fetchAllSkills })

/** After any write, refresh everything: the app is small and correctness matters more than requests. */
export function useInvalidateAll() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries()
}
