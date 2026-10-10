import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthProvider'
import { AccountNav } from '../components/AccountNav'
import { EmptyState, LinkButton, PageTitle, Pill, QueryView, TextLink } from '../components/ui'
import { fetchOffersByTeacher } from '../lib/api'
import { FORMAT_LABEL, LEVEL_LABEL } from '../lib/domain'
import { formatDateTime } from '../lib/time'

/** ACC-4 */
export function MyOffersPage() {
  const { userId } = useAuth()
  const offers = useQuery({ queryKey: ['my-offers', userId, 'all'], queryFn: () => fetchOffersByTeacher(userId!, false) })

  return (
    <>
      <PageTitle actions={<LinkButton to="/offers/new">Teach a skill</LinkButton>}>My offers</PageTitle>
      <AccountNav />
      <QueryView query={offers} label="Loading your offers">
        {(list) =>
          list.length === 0 ? (
            <EmptyState title="You are not teaching anything yet" action={<LinkButton to="/offers/new">Create your first offer</LinkButton>}>
              Everyone knows something worth sharing.
            </EmptyState>
          ) : (
            <table className="stack w-full border-separate border-spacing-0 overflow-hidden rounded-2xl text-left text-sm md:border md:shadow-card md:border-line md:bg-surface">
              <caption className="sr-only">Your offers</caption>
              <thead className="bg-surface-2 text-xs tracking-wide text-muted uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3">Offer</th>
                  <th scope="col" className="px-4 py-3">Format</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3">Accepted learners</th>
                  <th scope="col" className="px-4 py-3">Next class session</th>
                </tr>
              </thead>
              <tbody>
                {list.map((o) => (
                  <tr key={o.id}>
                    <td data-label="Offer" className="border-t border-line px-4 py-3">
                      <TextLink to={`/offers/${o.id}`} className="font-semibold">
                        {o.title}
                      </TextLink>
                      <span className="block text-muted">{o.skill_name}</span>
                    </td>
                    <td data-label="Format" className="border-t border-line px-4 py-3">
                      {FORMAT_LABEL[o.format]} · {LEVEL_LABEL[o.level]}
                    </td>
                    <td data-label="Status" className="border-t border-line px-4 py-3">
                      <Pill tone={o.status === 'active' ? 'green' : 'neutral'}>{o.status === 'active' ? 'Active' : 'Archived'}</Pill>
                    </td>
                    <td data-label="Accepted learners" className="border-t border-line px-4 py-3">
                      {o.accepted_count}
                      {o.format === 'class' && <span className="text-muted"> of {o.max_participants}</span>}
                    </td>
                    <td data-label="Next class session" className="border-t border-line px-4 py-3">
                      {o.next_session_at ? formatDateTime(o.next_session_at) : <span className="text-muted">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      </QueryView>
    </>
  )
}
