import * as React from 'react'
import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui'
import { cn } from '~/lib/utils'

const ToggleGroup = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
  <ToggleGroupPrimitive.Root
    ref={ref}
    className={cn('tilly-toggle-group flex flex-wrap [gap:8px]', className)}
    {...props}
  />
))
ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName

const ToggleGroupItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <ToggleGroupPrimitive.Item
    ref={ref}
    className={cn(
      "tilly-toggle-item [min-height:44px] [padding:8px_14px] [border:1px_solid_var(--color-tilly-border)] rounded-full [background:var(--color-tilly-surface)] [color:var(--color-tilly-text)] [font:inherit] [&[data-state='on']]:[border-color:var(--color-tilly-accent)] [&[data-state='on']]:[background:var(--color-tilly-accent)] [&[data-state='on']]:[color:var(--color-tilly-on-signal)] [&:focus-visible]:[outline:2px_solid_var(--color-tilly-accent)] [&:focus-visible]:[outline-offset:3px]",
      className,
    )}
    {...props}
  />
))
ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName

export { ToggleGroup, ToggleGroupItem }
