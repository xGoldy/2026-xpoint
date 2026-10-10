import type { UseQueryResult } from '@tanstack/react-query'
import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { errorMessage } from '../lib/errors'

const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ')
export { cx }

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-primary text-on-primary shadow-primary hover:bg-primary-hover hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none',
  secondary:
    'bg-surface text-ink border border-line shadow-card hover:border-primary hover:text-primary-ink disabled:opacity-50',
  ghost: 'text-primary-ink hover:bg-primary-soft disabled:opacity-50',
  danger: 'bg-surface text-danger-ink border border-danger-line hover:bg-danger-soft disabled:opacity-50',
}

// NFR-2: every touch target is at least 44 × 44 px.
const BUTTON_BASE =
  'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed'

export function Button({
  variant = 'primary',
  busy,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; busy?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={cx(BUTTON_BASE, VARIANTS[variant], className)}
    >
      {busy && <Spinner />}
      {children}
    </button>
  )
}

export function LinkButton({ variant = 'primary', className, ...rest }: LinkProps & { variant?: Variant }) {
  return <Link {...rest} className={cx(BUTTON_BASE, VARIANTS[variant], 'no-underline', className)} />
}

export function TextLink({ className, ...rest }: LinkProps) {
  return (
    <Link
      {...rest}
      className={cx('font-medium text-primary-ink underline decoration-primary-soft-strong decoration-2 underline-offset-4 hover:decoration-current', className)}
    />
  )
}

export function Spinner() {
  return <span aria-hidden="true" className="inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
}

// Forms -------------------------------------------------------------------------

interface FieldShellProps {
  label: ReactNode
  error?: string | null
  hint?: ReactNode
  optional?: boolean
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode
  className?: string
}

export function FieldShell({ label, error, hint, optional, children, className }: FieldShellProps) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined
  return (
    <div className={cx('flex flex-col gap-1', className)}>
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
        {optional && <span className="font-normal text-muted"> (optional)</span>}
      </label>
      {hint && (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      )}
      {children({ id, describedBy, invalid: Boolean(error) })}
      {error && (
        <p id={errorId} className="text-sm font-medium text-danger-ink">
          {error}
        </p>
      )}
    </div>
  )
}

const CONTROL =
  'min-h-11 w-full rounded-xl border bg-surface px-3.5 py-2 text-base text-ink shadow-sm transition placeholder:text-muted focus:border-primary disabled:bg-surface-2 read-only:bg-surface-2 read-only:text-muted'
const controlBorder = (invalid: boolean) => (invalid ? 'border-danger' : 'border-line-strong/60')

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  label: ReactNode
  error?: string | null
  hint?: ReactNode
  optional?: boolean
}

export function TextField({ label, error, hint, optional, className, ...rest }: TextFieldProps) {
  return (
    <FieldShell label={label} error={error} hint={hint} optional={optional} className={className}>
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cx(CONTROL, controlBorder(invalid))}
          {...rest}
        />
      )}
    </FieldShell>
  )
}

type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> & {
  label: ReactNode
  error?: string | null
  hint?: ReactNode
  optional?: boolean
}

export function SelectField({ label, error, hint, optional, className, children, ...rest }: SelectFieldProps) {
  return (
    <FieldShell label={label} error={error} hint={hint} optional={optional} className={className}>
      {({ id, describedBy, invalid }) => (
        <select
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cx(CONTROL, controlBorder(invalid))}
          {...rest}
        >
          {children}
        </select>
      )}
    </FieldShell>
  )
}

type TextareaFieldProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> & {
  label: ReactNode
  error?: string | null
  hint?: ReactNode
  optional?: boolean
}

export function TextareaField({ label, error, hint, optional, className, ...rest }: TextareaFieldProps) {
  return (
    <FieldShell label={label} error={error} hint={hint} optional={optional} className={className}>
      {({ id, describedBy, invalid }) => (
        <textarea
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cx(CONTROL, controlBorder(invalid), 'min-h-24')}
          {...rest}
        />
      )}
    </FieldShell>
  )
}

interface RadioGroupProps<T extends string> {
  legend: ReactNode
  name: string
  value: T
  options: { value: T; label: ReactNode; hint?: ReactNode }[]
  onChange: (value: T) => void
  error?: string | null
}

export function RadioGroup<T extends string>({ legend, name, value, options, onChange, error }: RadioGroupProps<T>) {
  const errorId = useId()
  return (
    <fieldset aria-describedby={error ? errorId : undefined}>
      <legend className="mb-1 text-sm font-semibold text-ink">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className={cx(
              'flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-2 text-sm transition has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-focus',
              value === o.value
                ? 'border-primary bg-primary-soft font-semibold text-primary-ink'
                : 'border-line bg-surface text-ink hover:border-primary/60',
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="size-4 accent-primary"
            />
            <span>
              {o.label}
              {o.hint && <span className="block text-xs font-normal text-muted">{o.hint}</span>}
            </span>
          </label>
        ))}
      </div>
      {error && (
        <p id={errorId} className="mt-1 text-sm font-medium text-danger-ink">
          {error}
        </p>
      )}
    </fieldset>
  )
}

export function FormError({ error }: { error: string | null | undefined }) {
  if (!error) return null
  return (
    <p role="alert" className="rounded-xl border border-danger-line bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-danger-ink">
      {error}
    </p>
  )
}

export function FormSuccess({ message }: { message: string | null | undefined }) {
  if (!message) return null
  return (
    <p role="status" className="rounded-xl border border-success/30 bg-success-soft px-3.5 py-2.5 text-sm font-medium text-success-ink">
      {message}
    </p>
  )
}

// Page structure ------------------------------------------------------------------

export function PageTitle({ children, subtitle, actions }: { children: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (typeof children === 'string') document.title = `${children} · SkillSwap`
  }, [children])
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 ref={ref} tabIndex={-1} className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          {children}
        </h1>
        {subtitle && <div className="mt-2 text-lg text-muted">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Section({ title, children, actions, id }: { title: ReactNode; children: ReactNode; actions?: ReactNode; id?: string }) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="mb-12 scroll-mt-24" id={id}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id={headingId} className="text-2xl font-bold tracking-tight text-ink">
          {title}
        </h2>
        {actions}
      </div>
      {children}
    </section>
  )
}

/** Classes for a card that is itself a link: lifts on hover like the reference design. */
export const INTERACTIVE_CARD =
  'block rounded-2xl border border-line bg-surface-glass p-5 text-ink no-underline shadow-card backdrop-blur transition duration-200 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lift'

export function Card({ children, className, as: As = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'li' | 'article' }) {
  return <As className={cx('rounded-2xl border border-line bg-surface-glass p-5 shadow-card backdrop-blur', className)}>{children}</As>
}

export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'brand' | 'amber' | 'red' | 'green' }) {
  const tones = {
    neutral: 'bg-surface-2 text-muted',
    brand: 'bg-primary-soft text-primary-ink',
    amber: 'bg-warn-soft text-warn-ink',
    red: 'bg-danger-soft text-danger-ink',
    green: 'bg-success-soft text-success-ink',
  }
  return <span className={cx('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', tones[tone])}>{children}</span>
}

export function Points({ total, count }: { total: number; count: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm text-ink">
      <span aria-hidden="true" className="text-star">
        ★
      </span>
      <span>
        <strong>{total}</strong> {total === 1 ? 'point' : 'points'}
        <span className="text-muted">
          {' '}
          · {count} {count === 1 ? 'rating' : 'ratings'}
        </span>
      </span>
    </span>
  )
}

// Data states (NFR-8) ---------------------------------------------------------------

export function Loading({ label = 'Loading' }: { label?: string }) {
  return (
    <p role="status" className="flex items-center gap-2 py-6 text-muted">
      <Spinner />
      {label}…
    </p>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-2xl border border-danger-line bg-danger-soft p-5 text-danger-ink">
      <p className="font-semibold">We could not load this.</p>
      <p className="text-sm">{errorMessage(error)}</p>
      {onRetry && (
        <Button variant="danger" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line-strong/50 bg-surface-glass p-8 text-center backdrop-blur">
      <p className="font-semibold text-ink">{title}</p>
      {children && <div className="mt-1 text-sm text-muted">{children}</div>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

/** Renders loading and error states, then the content. */
export function QueryView<T>({
  query,
  label,
  children,
}: {
  query: UseQueryResult<T>
  label?: string
  children: (data: T) => ReactNode
}) {
  if (query.isPending) return <Loading label={label} />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />
  return <>{children(query.data)}</>
}
