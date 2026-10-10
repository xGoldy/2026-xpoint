import { Link } from 'react-router-dom'
import type { TeacherCard } from '../lib/api'
import { fullName, plural } from '../lib/domain'
import { INTERACTIVE_CARD, Points } from './ui'

export function Avatar({ first, last, size = 'md' }: { first: string; last: string; size?: 'md' | 'lg' }) {
  return (
    <span
      aria-hidden="true"
      className={
        size === 'lg'
          ? 'bg-gradient-primary flex size-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-primary'
          : 'bg-gradient-primary flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white'
      }
    >
      {first.charAt(0)}
      {last.charAt(0)}
    </span>
  )
}

export function TeacherList({ teachers }: { teachers: TeacherCard[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {teachers.map((t) => (
        <li key={t.id}>
          <Link
            to={`/users/${t.username}`}
            className={`${INTERACTIVE_CARD} flex h-full items-start gap-3`}
          >
            <Avatar first={t.first_name} last={t.last_name} />
            <span className="min-w-0">
              <span className="block font-bold">{fullName(t)}</span>
              <span className="block text-sm text-muted">
                {t.locality_name} · {plural(t.active_offer_count, 'offer')}
              </span>
              <span className="mt-1 block">
                <Points total={t.points_total} count={t.rating_count} />
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
