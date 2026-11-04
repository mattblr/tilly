import * as React from 'react'
import { Checkbox as Primitive } from 'radix-ui'
import { Check } from 'lucide-react'
import { cn } from '~/lib/utils'

export const Checkbox = React.forwardRef<React.ElementRef<typeof Primitive.Root>, React.ComponentPropsWithoutRef<typeof Primitive.Root>>(
  ({ className, ...props }, ref) => <Primitive.Root ref={ref} {...props} className={cn('peer size-5 shrink-0 rounded border border-[var(--color-tilly-border)] data-[state=checked]:bg-tilly-accent data-[state=checked]:text-[var(--color-tilly-on-signal)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-tilly-accent disabled:opacity-50', className)}>
    <Primitive.Indicator className="grid place-items-center"><Check className="size-4" /></Primitive.Indicator>
  </Primitive.Root>,
)
Checkbox.displayName = 'Checkbox'
