import geometry from '../../../ios/Tilly/Resources/AvatarGeometry.json'
import { avatarIdentity } from './avatar-identity'
import { useId, useRef } from 'react'
import { useAvatarMotion } from './use-avatar-motion'
const path = (commands: number[][]) =>
  commands
    .map(
      ([kind, ...values]) =>
        `${['M', 'L', 'Q', 'C', 'Z'][kind]}${values.join(' ')}`,
    )
    .join(' ')
/** Original local geometry shared with SwiftUI. No external identity or image service. */
export function TillyAvatar({
  seed,
  size = 40,
  label,
  motion = true,
  state = 'idle',
}: {
  seed: string
  size?: number
  label?: string
  motion?: boolean
  state?: 'idle' | 'greeting'
}) {
  const traits = avatarIdentity(seed)
  const ref = useRef<SVGSVGElement>(null)
  const active = useAvatarMotion(ref, motion)
  const clip = useId().replace(/:/g, '')
  return (
    <svg
      ref={ref}
      className={'tilly-avatar block flex-none max-w-[100%] rounded-full'}
      viewBox="0 0 96 96"
      width={size}
      height={size}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-motion={motion}
      data-state={state}
      data-active={active}
    >
      <defs>
        <clipPath id={`${clip}-left`}><path d={path(geometry.leftEars[traits.ears])} /></clipPath>
        <clipPath id={`${clip}-right`}><path d={path(geometry.rightEar)} /></clipPath>
      </defs>
      <circle cx="48" cy="48" r="48" fill="#1558DF" />
      <g fill="#F5F5F2">
        <g
          className={[
            'tilly-avatar-ear [transform-box:view-box] [transform-origin:30px_36px]',
            "[.tilly-avatar[data-active='true']_&]:[animation:tilly-ear-flick_600ms_ease-in-out_1,tilly-ear-idle_14s_ease-in-out_1.2s_infinite]",
            // A persistent greeting/hover state must not replace the idle loop with one flick.
            "[.tilly-avatar[data-active='true']:hover_&]:[animation:tilly-ear-flick_600ms_ease-in-out_1,tilly-ear-idle_14s_ease-in-out_1.2s_infinite]",
            "[.tilly-avatar[data-active='true'][data-state='greeting']_&]:[animation:tilly-ear-flick_600ms_ease-in-out_2,tilly-ear-idle_14s_ease-in-out_1.2s_infinite]",
            "[button:focus-visible_.tilly-avatar[data-active='true']_&]:[animation:tilly-ear-flick_600ms_ease-in-out_1,tilly-ear-idle_14s_ease-in-out_1.2s_infinite]",
            'motion-reduce:[.tilly-avatar_&]:[animation:none]! motion-reduce:[.tilly-avatar_&]:[transform:none]!',
          ].join(' ')}
        >
          <path d={path(geometry.leftEars[traits.ears])} />
          <g clipPath={`url(#${clip}-left)`}><path d={path(geometry.leftInnerEars[traits.ears])} fill="#1558DF" /></g>
        </g>
        <g>
          <path d={path(geometry.rightEar)} />
          <g clipPath={`url(#${clip}-right)`}><path d={path(geometry.rightInnerEar)} fill="#1558DF" /></g>
        </g>
        <path d={path(geometry.heads[traits.head])} />
      </g>
      <path
        d={path(geometry.markings[traits.marking])}
        fill="#1558DF"
        opacity=".23"
      />
      <g
        stroke="#1558DF"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <g className="[transform-box:view-box] [transform-origin:48px_48px] [.tilly-avatar[data-active='true']_&]:[animation:tilly-avatar-blink_9s_ease-in-out_infinite] motion-reduce:[animation:none]!"
          style={{ animationDelay: `${traits.eyes * 0.7 + traits.ears * 0.3}s` }}><path d={path(geometry.eyes[traits.eyes])} /></g>
        <path d={path(geometry.mouth)} />
      </g>
      <path d={path(geometry.nose)} fill="#1558DF" />
    </svg>
  )
}
