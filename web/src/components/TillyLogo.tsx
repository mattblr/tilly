import { Link } from '@tanstack/react-router'
import { useAppCopy } from '~/features/app/copy'
/** One wordmark asset and size across the website and web app. */
export function TillyLogo({ className = '' }: { className?: string }) {
  const t = useAppCopy()
  return (
    <Link
      to="/"
      className={`tilly-logo inline-flex items-center flex-none [min-height:44px] [&_img]:block [&_img]:[width:92px] [&_img]:[height:auto] [@media(max-width:_600px)]:[&_img]:[width:66px] [&_img]:[aspect-ratio:2868_/_1320] [@media(max-width:_380px)]:[.app-header_&_img]:[width:68px] ${className}`}
    >
      <img
        src="/images/tilly-logo.png"
        alt={t('website.brand')}
        width="92"
        height="42.343"
        className={
          'light-invert [html.light_&]:[filter:invert(1)_brightness(0.2)]'
        }
        draggable={false}
      />
    </Link>
  )
}
