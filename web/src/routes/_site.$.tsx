import { createFileRoute, notFound, useLocation } from '@tanstack/react-router'
import { buildSeoMeta, buildSeoLinks, type PageBlock } from '~/lib/platform'
import { PageContent } from '~/components/PageContent'
import { GetPageDocument } from '~/generated/foir.content.generated'
import { isFoirNotFound } from '@foir/sdk/client'
import { useAppCopy } from '~/features/app/copy'

export const Route = createFileRoute('/_site/$')({
  // Resolve the page in the loader so head() can set per-page SEO from the CMS.
  loader: async ({ params, context }) => {
    const slug = params._splat ?? ''
    try {
      const { page } = await context.content.request(GetPageDocument, {
        naturalKey: slug,
        locale: context.locale,
        preview: context.preview,
      })
      // A missing page answers 404, so crawlers and link checkers see it.
      if (!page) throw notFound()
      return { slug, page }
    } catch (error) {
      // An unavailable CMS is not evidence that its page does not exist.
      if (isFoirNotFound(error)) throw notFound()
      throw error
    }
  },
  head: ({ loaderData }) => {
    const page = loaderData?.page
    if (!page) return {}
    return {
      meta: buildSeoMeta(page.seo, page.title),
      links: buildSeoLinks(
        page.seo,
        loaderData?.slug ? `/${loaderData.slug}` : undefined,
      ),
    }
  },
  component: ContentPage,
  notFoundComponent: NotFound,
})

function ContentPage() {
  const { page } = Route.useLoaderData()

  const blocks = (page.blocks?.entries ?? []).filter(
    (block): block is PageBlock => block !== null,
  )

  return (
    <PageContent
      title={page.title ?? ''}
      blocks={blocks}
      jsonLd={page.seo?.jsonLd}
    />
  )
}

function NotFound() {
  const t = useAppCopy()
  const slug = useLocation().pathname.replace(/^\/+/, '')
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div
        className={
          'glass-card [background:var(--color-tilly-glass)] [border:1px_solid_var(--color-tilly-glass-border)] [backdrop-filter:blur(24px)] [-webkit-backdrop-filter:blur(24px)] rounded-2xl p-10 text-center max-w-md'
        }
      >
        <p className="font-sans text-6xl font-bold text-tilly-text-tertiary mb-4">
          404
        </p>
        <p className="font-serif text-xl text-tilly-text mb-2">
          {t('website.notFoundTitle')}
        </p>
        <p className="font-sans text-sm text-tilly-text-secondary mb-8">
          {t('website.notFoundBody')}{' '}
          <span className="text-tilly-accent-light">/{slug}</span>
        </p>
        <a
          href="/"
          className="inline-block rounded-full bg-tilly-accent px-6 py-2.5 font-sans text-sm font-medium text-tilly-text transition-colors hover:bg-tilly-accent-light"
        >
          {t('website.backHome')}
        </a>
      </div>
    </div>
  )
}
