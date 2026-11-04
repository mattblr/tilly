import { CopyText } from '~/components/CopyText'
import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '~/lib/utils'
import { DialogOverlay, DialogPortal } from './dialog'

const Sheet = DialogPrimitive.Root
const SheetTrigger = DialogPrimitive.Trigger
const SheetTitle = DialogPrimitive.Title
const SheetDescription = DialogPrimitive.Description

/** Bottom sheet has its own geometry; it never inherits a centred dialog's
 * individual translate properties or slide-from-centre animation variables. */
const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    showClose?: boolean
  }
>(({ className, children, showClose = true, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 grid max-h-[90dvh] w-full gap-4 overflow-y-auto rounded-t-3xl border-t border-[var(--color-tilly-border)] bg-tilly-bg p-5 pb-[max(24px,env(safe-area-inset-bottom))] font-sans text-tilly-text shadow-lg outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom motion-reduce:animate-none',
        className,
      )}
      {...props}
    >
      {children}
      {showClose && (
        <DialogPrimitive.Close className="absolute right-3 top-3 grid size-11 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-tilly-accent">
          <X size={20} aria-hidden="true" />
          <span className="sr-only"><CopyText name="common.close" /></span>
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPortal>
))
SheetContent.displayName = 'SheetContent'
export { Sheet, SheetTrigger, SheetContent, SheetTitle, SheetDescription }
