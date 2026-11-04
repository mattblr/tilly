import { useEffect } from 'react'
import * as CookieConsent from 'vanilla-cookieconsent'
import { useTheme } from '~/components/ThemeProvider'
import type { CookieConsentData } from '~/lib/platform'

export function CookieConsentBanner({
  data,
}: {
  data: CookieConsentData | null
}) {
  const { resolvedTheme } = useTheme()

  // Sync dark mode class with theme
  useEffect(() => {
    document.documentElement.classList.toggle(
      'cc--darkmode',
      resolvedTheme === 'dark',
    )
  }, [resolvedTheme])

  useEffect(() => {
    if (!data) return

    // Build categories from sections that have a categoryKey
    const categories: Record<string, { enabled: boolean; readOnly: boolean }> =
      {}
    const validSections = (data.sections ?? []).filter(
      (s): s is NonNullable<typeof s> => s != null,
    )
    for (const section of validSections) {
      if (section.categoryKey) {
        categories[section.categoryKey] = {
          enabled: section.enabled ?? false,
          readOnly: section.readOnly ?? false,
        }
      }
    }

    // Build preferences modal sections
    const sections = validSections.map((section) => {
      const base: {
        title: string
        description: string
        linkedCategory?: string
      } = {
        title: section.title ?? '',
        description: section.description ?? '',
      }
      if (section.categoryKey) {
        base.linkedCategory = section.categoryKey
      }
      return base
    })

    CookieConsent.run({
      categories,
      guiOptions: {
        consentModal: {
          layout: 'box',
          position: 'bottom right',
        },
      },
      language: {
        default: 'en',
        translations: {
          en: {
            consentModal: {
              title: data.consentTitle ?? '',
              description: data.consentDescription ?? '',
              acceptAllBtn: data.acceptAllLabel ?? '',
              acceptNecessaryBtn: data.rejectAllLabel ?? '',
              showPreferencesBtn: data.manageLabel ?? '',
            },
            preferencesModal: {
              title: data.preferencesTitle ?? '',
              acceptAllBtn: data.acceptAllLabel ?? '',
              acceptNecessaryBtn: data.rejectAllLabel ?? '',
              savePreferencesBtn: data.saveLabel ?? '',
              sections,
            },
          },
        },
      },
    })
  }, [data])

  return null
}
