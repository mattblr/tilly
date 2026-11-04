import type { ReactNode } from 'react'
import {
  ContentAlignEnum,
  OverlaySettingsPositionEnum,
  OverlaySettingsScrimColorEnum,
  OverlaySettingsThemeEnum,
} from '~/generated/foir.content.generated'
import type {
  ContentFieldsFragment,
  OverlaySettingsFieldsFragment,
} from '~/generated/foir.content.generated'
import { ContentBody } from './ContentBlock'

// Outer flex placement of the overlay body. Text alignment is deliberately
// NOT set here — the inner content controls its own text + items alignment
// via `align`, and a `text-*` here would just get overridden.
const OVERLAY_POSITION: Record<OverlaySettingsPositionEnum, string> = {
  [OverlaySettingsPositionEnum.top_left]: 'items-start justify-start',
  [OverlaySettingsPositionEnum.top_center]: 'items-start justify-center',
  [OverlaySettingsPositionEnum.top_right]: 'items-start justify-end',
  [OverlaySettingsPositionEnum.center]: 'items-center justify-center',
  [OverlaySettingsPositionEnum.bottom_left]: 'items-end justify-start',
  [OverlaySettingsPositionEnum.bottom_center]: 'items-end justify-center',
  [OverlaySettingsPositionEnum.bottom_right]: 'items-end justify-end',
}

const POSITION_TO_ALIGN: Record<OverlaySettingsPositionEnum, ContentAlignEnum> = {
  [OverlaySettingsPositionEnum.top_left]: ContentAlignEnum.start,
  [OverlaySettingsPositionEnum.top_center]: ContentAlignEnum.center,
  [OverlaySettingsPositionEnum.top_right]: ContentAlignEnum.end,
  [OverlaySettingsPositionEnum.center]: ContentAlignEnum.center,
  [OverlaySettingsPositionEnum.bottom_left]: ContentAlignEnum.start,
  [OverlaySettingsPositionEnum.bottom_center]: ContentAlignEnum.center,
  [OverlaySettingsPositionEnum.bottom_right]: ContentAlignEnum.end,
}

/** Map an overlay position to its horizontal-text-alignment default. */
export function overlayPositionAlign(
  position: OverlaySettingsPositionEnum | null | undefined,
): ContentAlignEnum {
  return POSITION_TO_ALIGN[position ?? OverlaySettingsPositionEnum.bottom_left]
}

/**
 * Scrim + position frame for an overlay. Renders only when there are children
 * to show; expects the parent to be `relative` so the absolute positioning
 * lands inside it.
 */
export function OverlayShell({
  settings,
  paddingClass = 'p-8 md:p-12',
  children,
}: {
  settings: OverlaySettingsFieldsFragment | null | undefined
  paddingClass?: string
  children: ReactNode
}) {
  const opacity = Math.max(0, Math.min(100, Number(settings?.scrimOpacity ?? 0)))
  const position = settings?.position ?? OverlaySettingsPositionEnum.bottom_left

  return (
    <>
      {opacity > 0 ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundColor:
              settings?.scrimColor === OverlaySettingsScrimColorEnum.light
                ? `rgba(255, 255, 255, ${opacity / 100})`
                : `rgba(0, 0, 0, ${opacity / 100})`,
          }}
        />
      ) : null}
      <div
        className={`pointer-events-none absolute inset-0 flex ${paddingClass} ${OVERLAY_POSITION[position]}`}
      >
        <div
          className={`pointer-events-auto max-w-xl ${
            settings?.theme === OverlaySettingsThemeEnum.dark
              ? 'text-[#1A1A1A]'
              : 'text-[#F2F0ED]'
          }`}
        >
          {children}
        </div>
      </div>
    </>
  )
}

/** Scrim + content layer for a media block's overlay. */
export function MediaOverlayLayer({
  content,
  settings,
  paddingClass,
}: {
  content: ContentFieldsFragment | null | undefined
  settings: OverlaySettingsFieldsFragment | null | undefined
  paddingClass?: string
}) {
  if (!content) return null
  return (
    <OverlayShell settings={settings} paddingClass={paddingClass}>
      <ContentBody
        content={content}
        defaultAlign={overlayPositionAlign(settings?.position)}
        // Overlay prose inherits the theme colour from OverlayShell rather
        // than the page's fixed text colour.
        proseClassName="page-content font-serif"
      />
    </OverlayShell>
  )
}
