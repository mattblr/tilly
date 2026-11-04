import { useAppCopy } from '~/features/app/copy'

/** Shared controls use the same published words as their surrounding surface. */
export function CopyText({ name }: { name: string }) {
  return useAppCopy()(name)
}
