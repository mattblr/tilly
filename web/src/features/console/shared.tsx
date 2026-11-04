import { useAppCopy } from '~/features/app/copy'
import { friendlyError } from '~/lib/failures'
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Button } from '~/features/console/components/ui/button'
import { Input } from '~/features/console/components/ui/input'
import { Textarea } from '~/features/console/components/ui/textarea'
import { Label } from '~/features/console/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/features/console/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/features/console/components/ui/alert-dialog'
import { Skeleton } from '~/features/console/components/ui/skeleton'

export function useLoad<T>(loader: () => Promise<T>) {
  const message = useMessage()
  const describe = useRef(message)
  describe.current = message
  const latest = useRef(loader)
  latest.current = loader
  const generation = useRef(0)
  const [data, setData] = useState<T>()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const reload = useCallback(async () => {
    const run = ++generation.current
    setLoading(true)
    setError('')
    try {
      const found = await latest.current()
      if (run === generation.current) setData(found)
    } catch (error) {
      if (run === generation.current) setError(describe.current(error))
    } finally {
      if (run === generation.current) setLoading(false)
    }
  }, [])
  useEffect(() => {
    void reload()
    return () => {
      generation.current++
    }
  }, [reload])
  return { data, error, loading, reload }
}

export function useMessage() {
  const t = useAppCopy()
  return (error: unknown) => friendlyError(error, t)
}

export function LoadState({
  loading,
  error,
  retry,
}: {
  loading: boolean
  error: string
  retry: () => unknown
}) {
  const t = useAppCopy()
  if (error)
    return (
      <div
        className={[
          'load-error [border-left:2px_solid_var(--destructive)] p-[4px_14px] m-[16px_0]',
          '[&_p]:mb-2.5',
        ].join(' ')}
        role="alert"
      >
        <p>{error}</p>
        <Button variant="outline" size="sm" onClick={() => void retry()}>
          {t("common.retry")}</Button>
      </div>
    )
  if (loading)
    return (
      <div
        className={'loading grid gap-4.5 p-[16px_0]'}
        role="status"
        aria-label={t("common.loading")}
      >
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-8 w-2/3" />
      </div>
    )
  return null
}

export function TextField({
  label,
  value,
  onChange,
  type = 'text',
  min,
  required = false,
  disabled = false,
  placeholder,
}: {
  label: string
  value: string | number
  onChange?: (value: string) => void
  type?: string
  min?: number
  required?: boolean
  disabled?: boolean
  placeholder?: string
}) {
  const id = useId()
  return (
    <div
      className={[
        'field flex flex-col gap-1.75 min-w-0',
        '[&_label]:text-[12px] [&_label]:font-medium',
        '[&_input]:text-[13px] [&_input]:[background:var(--background)] [&_input]:[box-shadow:none]',
        '[&_textarea]:text-[13px] [&_textarea]:[background:var(--background)] [&_textarea]:[box-shadow:none] [&_textarea]:min-h-35 [&_textarea]:leading-[1.6] [&_textarea]:[resize:vertical]',
        '[&_>_button]:text-[13px] [&_>_button]:[background:var(--background)] [&_>_button]:[box-shadow:none] [&_>_button]:w-full',
        '[.gallery-tools_&_label]:absolute [.gallery-tools_&_label]:w-0.25 [.gallery-tools_&_label]:h-0.25 [.gallery-tools_&_label]:p-0 [.gallery-tools_&_label]:overflow-hidden [.gallery-tools_&_label]:[clip:rect(0,_0,_0,_0)]',
        '[.gallery-tools_&_>_button]:h-7.5 [.gallery-tools_&_>_button]:text-[12px] [.gallery-tools_&_>_button]:min-w-29 [.gallery-tools_&_>_button]:[border-color:var(--border)]',
        'max-[760px]:[.recipe_&_textarea]:min-h-25',
      ].join(' ')}
    >
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        min={min}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </div>
  )
}

export function Area({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const id = useId()
  return (
    <div
      className={[
        'field flex flex-col gap-1.75 min-w-0',
        '[&_label]:text-[12px] [&_label]:font-medium',
        '[&_input]:text-[13px] [&_input]:[background:var(--background)] [&_input]:[box-shadow:none]',
        '[&_textarea]:text-[13px] [&_textarea]:[background:var(--background)] [&_textarea]:[box-shadow:none] [&_textarea]:min-h-35 [&_textarea]:leading-[1.6] [&_textarea]:[resize:vertical]',
        '[&_>_button]:text-[13px] [&_>_button]:[background:var(--background)] [&_>_button]:[box-shadow:none] [&_>_button]:w-full',
        '[.gallery-tools_&_label]:absolute [.gallery-tools_&_label]:w-0.25 [.gallery-tools_&_label]:h-0.25 [.gallery-tools_&_label]:p-0 [.gallery-tools_&_label]:overflow-hidden [.gallery-tools_&_label]:[clip:rect(0,_0,_0,_0)]',
        '[.gallery-tools_&_>_button]:h-7.5 [.gallery-tools_&_>_button]:text-[12px] [.gallery-tools_&_>_button]:min-w-29 [.gallery-tools_&_>_button]:[border-color:var(--border)]',
        'max-[760px]:[.recipe_&_textarea]:min-h-25',
      ].join(' ')}
    >
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
      />
    </div>
  )
}

export function Choice({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  disabled?: boolean
}) {
  const t = useAppCopy()
  const id = useId()
  return (
    <div
      className={[
        'field flex flex-col gap-1.75 min-w-0',
        '[&_label]:text-[12px] [&_label]:font-medium',
        '[&_input]:text-[13px] [&_input]:[background:var(--background)] [&_input]:[box-shadow:none]',
        '[&_textarea]:text-[13px] [&_textarea]:[background:var(--background)] [&_textarea]:[box-shadow:none] [&_textarea]:min-h-35 [&_textarea]:leading-[1.6] [&_textarea]:[resize:vertical]',
        '[&_>_button]:text-[13px] [&_>_button]:[background:var(--background)] [&_>_button]:[box-shadow:none] [&_>_button]:w-full',
        '[.gallery-tools_&_label]:absolute [.gallery-tools_&_label]:w-0.25 [.gallery-tools_&_label]:h-0.25 [.gallery-tools_&_label]:p-0 [.gallery-tools_&_label]:overflow-hidden [.gallery-tools_&_label]:[clip:rect(0,_0,_0,_0)]',
        '[.gallery-tools_&_>_button]:h-7.5 [.gallery-tools_&_>_button]:text-[12px] [.gallery-tools_&_>_button]:min-w-29 [.gallery-tools_&_>_button]:[border-color:var(--border)]',
        'max-[760px]:[.recipe_&_textarea]:min-h-25',
      ].join(' ')}
    >
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={t("console.choose")} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function Action({
  children,
  work,
  primary = false,
  disabled = false,
  className,
}: {
  children: ReactNode
  work: () => Promise<unknown>
  primary?: boolean
  disabled?: boolean
  className?: string
}) {
  const t = useAppCopy()
  const message = useMessage()
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState(false)
  return (
    <div
      className={`action flex items-center [gap:12px] flex-wrap [&_button]:[font-size:12px] [&_button]:[box-shadow:none] [&_button]:[height:34px] [&_button:disabled]:[opacity:1] [&_button:disabled]:[background:var(--muted)] [&_button:disabled]:[color:var(--muted-foreground)] [&_button:disabled]:[border:1px_solid_var(--border)] ${className ?? ''}`}
    >
      <Button
        type="button"
        variant={primary ? 'default' : 'outline'}
        disabled={busy || disabled}
        aria-busy={busy}
        onClick={async () => {
          setBusy(true)
          setStatus('')
          setError(false)
          try {
            const result = await work()
            setStatus(typeof result === 'string' ? result : t("console.saved"))
          } catch (err) {
            setError(true)
            setStatus(message(err))
          } finally {
            setBusy(false)
          }
        }}
      >
        {busy ? t("notifications.console.working") : children}
      </Button>
      <span
        role="status"
        aria-live="polite"
        className={
          error
            ? 'error [color:var(--destructive)] [font-size:12px] [overflow-wrap:anywhere]'
            : 'save-status [font-size:12px] [color:var(--muted-foreground)]'
        }
      >
        {status}
      </span>
    </div>
  )
}

export function Confirm({
  title,
  description,
  children,
  work,
  actionLabel,
  busyLabel,
  cancelLabel,
}: {
  title: string
  description: string
  children: ReactNode
  work: () => Promise<unknown>
  actionLabel?: string
  busyLabel?: string
  cancelLabel?: string
}) {
  const t = useAppCopy()
  const message = useMessage()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <AlertDialog
      open={open}
      onOpenChange={(value) => {
        if (!busy) {
          setOpen(value)
          setError('')
        }
      }}
    >
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p
            role="alert"
            className={
              'error [color:var(--destructive)] text-[12px] [overflow-wrap:anywhere]'
            }
          >
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{cancelLabel ?? t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            onClick={async (event) => {
              event.preventDefault()
              setBusy(true)
              setError('')
              try {
                await work()
                setOpen(false)
              } catch (err) {
                setError(message(err))
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy ? (busyLabel ?? t("console.removing")) : (actionLabel ?? t("console.remove"))}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p
      className={'empty p-[36px_0] text-[13px] [color:var(--muted-foreground)]'}
    >
      {children}
    </p>
  )
}

export {stateLabel} from './copy'
