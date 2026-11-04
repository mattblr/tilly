import { designTokenStyle } from '~/lib/design-tokens'
import { GetDesignTokensDocument } from '~/generated/foir.content.generated'
import { createFileRoute } from '@tanstack/react-router'
import appCss from '~/styles/app.css?url'
import { ThemeProvider } from '~/components/ThemeProvider'
import { AppSession } from '~/features/app/session'
import { AppShell } from '~/features/app/Shell'
import { readAppCopyRecords, resolveAppCopy, formatAppCopy } from '~/features/app/copy'
export const Route = createFileRoute('/_app')({
  ssr: false,
  loader: async ({ context }) => {
    const [tokens, words] = await Promise.allSettled([
      context.content.request(GetDesignTokensDocument),
      readAppCopyRecords(context.foir, context.locale),
    ])
    return {
      tokenStyle: designTokenStyle(tokens.status === 'fulfilled' ? tokens.value.designTokens : null),
      copyRecords: words.status === 'fulfilled' ? words.value : [],
    }
  },
  head: ({loaderData}) => ({
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/images/tilly-icon.png' },
    ],
    meta: [{ title: formatAppCopy(resolveAppCopy(loaderData?.copyRecords ?? []), 'website.metaTitle') }],
  }),
  component: AppLayout,
})
function AppLayout() {
  const { tokenStyle } = Route.useLoaderData()
  return (
    <ThemeProvider defaultTheme="dark">
      <style>{tokenStyle}</style>
      <AppSession>
        <AppShell />
      </AppSession>
    </ThemeProvider>
  )
}
