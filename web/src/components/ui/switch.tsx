import * as React from 'react'
import { Switch as Primitive } from 'radix-ui'
import { cn } from '~/lib/utils'

export const Switch = React.forwardRef<React.ElementRef<typeof Primitive.Root>, React.ComponentPropsWithoutRef<typeof Primitive.Root>>(
  ({ className, ...props }, ref) => <Primitive.Root ref={ref} {...props} className={cn(
    'peer inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-tilly-accent data-[state=checked]:bg-tilly-accent data-[state=unchecked]:bg-tilly-surface', className,
  )}><Primitive.Thumb className="pointer-events-none block size-5 rounded-full bg-tilly-text shadow-sm transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0" /></Primitive.Root>,
)
Switch.displayName = 'Switch'
