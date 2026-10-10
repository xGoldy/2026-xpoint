import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchAllSkills, fetchCategories, fetchLocalities, fetchPeopleData, type Profile } from './api'
import { recommendPeople } from './recommend'

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

/** Ranked people to swap skills with, for the logged-in member. */
export function usePeopleRecommendations(profile: Profile | null) {
  const localities = useLocalities()
  const localityName = localities.data?.find((l) => l.id === profile?.locality_id)?.name ?? ''
  return useQuery({
    queryKey: ['people', profile?.id, localityName],
    queryFn: async () => {
      const data = await fetchPeopleData(profile!, localityName)
      return { me: data.me, recommendations: recommendPeople(data.me, data.candidates) }
    },
    enabled: Boolean(profile && localities.data),
  })
}
