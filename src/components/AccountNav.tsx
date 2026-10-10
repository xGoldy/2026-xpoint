import { NavLink } from 'react-router-dom'
import { cx } from './ui'

export function AccountNav() {
  const link = ({ isActive }: { isActive: boolean }) =>
    cx(
      'inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold no-underline',
      isActive ? 'bg-primary text-white shadow-primary' : 'text-muted hover:bg-surface-2 hover:text-ink',
    )
  return (
    <nav aria-label="Account sections" className="mb-6 overflow-x-auto">
      <ul className="flex gap-1 border-b border-line pb-2">
        <li>
          <NavLink end to="/account" className={link}>
            Profile & settings
          </NavLink>
        </li>
        <li>
          <NavLink to="/account/offers" className={link}>
            My offers
          </NavLink>
        </li>
        <li>
          <NavLink to="/account/sessions" className={link}>
            My sessions
          </NavLink>
        </li>
      </ul>
    </nav>
  )
}
