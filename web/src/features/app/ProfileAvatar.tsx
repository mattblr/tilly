import { TillyAvatar } from '~/components/TillyAvatar'
import { cn } from '~/lib/utils'
import { Photo, type PhotoSource } from './CatchImage'

const sizes = {
  32: 'size-8',
  34: 'size-8.5',
  44: 'size-11',
  96: 'size-24',
  112: 'size-28',
} as const
/** Photo media fills this fixed box, never the author row. Generated defaults
 * and failed-image fallbacks occupy exactly the same space. */
export function ProfileAvatar({
  photo,
  seed,
  size = 34,
  className,
}: {
  photo: PhotoSource
  seed: string
  size?: keyof typeof sizes
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative inline-flex shrink-0 overflow-hidden rounded-full',
        sizes[size],
        className,
      )}
    >
      <Photo
        src={photo}
        alt=""
        size="small"
        className="size-full"
        fallback={<TillyAvatar seed={seed} size={size} />}
      />
    </span>
  )
}
