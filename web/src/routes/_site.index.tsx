import ProgressiveMedia from '~/components/ProgressiveMedia'
import { createFileRoute } from '@tanstack/react-router'
import { Fragment } from 'react'
import { CatchImage } from '~/features/app/CatchImage'
import { LiveActivity } from '~/features/activity/LiveActivity'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '~/components/ui/accordion'
import { GetPageDocument } from '~/generated/foir.content.generated'
import { buildSeoMeta, buildSeoLinks } from '~/lib/platform'
import {
  defaultHomeCopy,
  defaultHomeImages,
  resolveHomeCopy,
  resolveHomeImages,
  type HomeCopy,
  type HomeImages,
  type HomeImage,
} from '~/lib/home-content'

export const Route = createFileRoute('/_site/')({
  loader: async ({ context }) => {
    // The SDK preserves Fóir's native field locale resolution. There is no
    // translation service or privileged web proxy between this route and Fóir.
    const [words, page] = await Promise.allSettled([
      context.foir['ui-copy'].findUnique({
        naturalKey: 'marketing-home',
        locale: context.locale,
        preview: context.preview,
      }),
      context.content.request(GetPageDocument, {
        naturalKey: 'home',
        locale: context.locale,
        preview: context.preview,
      }),
    ])
    const cmsPage = page.status === 'fulfilled' ? page.value.page : null
    const copy = resolveHomeCopy(
      words.status === 'fulfilled'
        ? (words.value?.entries ?? []).filter((entry) => entry !== null)
        : [],
    )
    return {
      copy,
      images: resolveHomeImages(cmsPage, copy),
      page: cmsPage,
      preview: context.preview,
    }
  },
  head: ({ loaderData }) => ({
    meta: buildSeoMeta(loaderData?.page?.seo, undefined, {
      title: (loaderData?.copy ?? defaultHomeCopy)['meta.title'],
      description: (loaderData?.copy ?? defaultHomeCopy)['meta.description'],
    }),
    links: buildSeoLinks(loaderData?.page?.seo),
  }),
  component: HomeRoute,
})

function HomeRoute() {
  const { copy, images, preview } = Route.useLoaderData()
  return <HomePage copy={copy} images={images} preview={preview} />
}

function Lines({ text }: { text: string }) {
  return text.split('\n').map((line, index) => (
    <Fragment key={index}>
      {index > 0 && <br />}
      {line}
    </Fragment>
  ))
}

function HomeMedia({
  image,
  ratio,
  className = '',
  priority = false,
}: {
  image: HomeImage
  ratio: number
  className?: string
  priority?: boolean
}) {
  return (
    <ProgressiveMedia
      image={{
        ...(image.source ?? { url: image.url }),
        width: ratio * 1000,
        height: 1000,
      }}
      alt={image.alt}
      className={`tilly-site-media block w-full [.tilly-device_>_&]:[border-radius:17px] [.tilly-collection_>_&]:[border-radius:4px] [@media(prefers-reduced-motion:_reduce)]:[&_[class*='transition-opacity']]:[transition:none] ${className}`}
      priority={priority}
    />
  )
}

export function HomePage({
  copy = defaultHomeCopy,
  images = defaultHomeImages,
  preview = false,
}: {
  copy?: HomeCopy
  images?: HomeImages
  preview?: boolean
}) {
  return (
    <main
      className={[
        "tilly-site [--site-ink:var(--color-tilly-text)] [--site-ground:var(--color-tilly-bg)] [--site-panel:var(--color-tilly-surface)] [--site-accent:var(--color-tilly-accent)] relative z-1 max-w-[var(--page-width,_1200px)] p-[0_28px] m-[auto] [color:var(--site-ink)] [font-family:'Work_Sans',_sans-serif] px-[var(--page-gutter,_20px)]",
        "[&_h1]:[font-family:Georgia,_'Times_New_Roman',_serif] [&_h1]:font-normal [&_h1]:tracking-[-0.055em]",
        "[&_h2]:[font-family:Georgia,_'Times_New_Roman',_serif] [&_h2]:font-normal [&_h2]:tracking-[-0.055em] [&_h2]:text-[clamp(36px,_4.2vw,_58px)] [&_h2]:leading-[1.08] [&_h2]:m-0",
        '[&_p]:text-[18px] [&_p]:leading-[1.6]',
        '[&_:focus-visible]:[outline:3px_solid_var(--site-accent)] [&_:focus-visible]:[outline-offset:5px]',
        'max-[600px]:p-[0_20px]',
        'max-[600px]:[&_h2]:text-[37px]',
        '[&_section[id]]:[scroll-margin-top:110px]',
        'min-[768px]:px-[var(--page-gutter-md,_28px)]',
        '[.site-shell_>_&]:flex-1',
      ].join(' ')}
    >
      <section
        className={[
          'tilly-hero text-center p-[138px_0_60px]',
          '[&_h1]:text-[clamp(54px,_7.2vw,_96px)] [&_h1]:leading-[0.99] [&_h1]:m-[0_auto]',
          '[&_>_p]:m-[30px_0] [&_>_p]:text-[20px]',
          'max-[600px]:pt-29.5 max-[600px]:pb-5',
          'max-[600px]:[&_h1]:text-[53px]',
          'max-[600px]:[&_>_p]:text-[17px] max-[600px]:[&_>_p]:m-[24px_auto] max-[600px]:[&_>_p]:max-w-[30ch]',
          '[.site-shell_&]:pt-16',
        ].join(' ')}
        aria-labelledby="hero-title"
      >
        <h1 id="hero-title">
          <Lines text={copy['hero.title']} />
        </h1>
        <p>
          <Lines text={copy['hero.body']} />
        </p>
        <a
          className={[
            'tilly-button inline-flex items-center justify-center gap-5.5 min-h-13 p-[14px_25px] rounded-full [background:var(--color-tilly-accent)] [color:var(--color-tilly-on-signal)] text-[16px] font-medium [transition:transform_0.2s]',
            'hover:[transform:translateY(-3px)]',
            '[&:active]:[transform:scale(0.97)]',
          ].join(' ')}
          href="#play"
        >
          {copy['hero.action']} <span aria-hidden="true">↗</span>
        </a>
        <span className={'tilly-availability block m-[16px_0_0] text-[14px]'}>
          {copy['hero.availability']}
        </span>
        <div
          className={[
            'tilly-collage relative grid [grid-template-columns:1fr_1.15fr_1fr] items-center gap-10 max-w-[1000px] m-[65px_auto_0] p-[22px_8px]',
            '[&_figure]:m-0',
            'max-[900px]:gap-6.5',
            'max-[600px]:block max-[600px]:max-w-[360px] max-[600px]:p-0 max-[600px]:mt-10',
          ].join(' ')}
        >
          <figure
            className={[
              'tilly-encounter p-[12px_12px_18px] [background:#ebece5] [color:#191c17] tilly-encounter-street [transform:rotate(-9deg)_translateY(16px)]',
              '[&_img]:w-full [&_img]:block [&_img]:object-cover [&_img]:aspect-[1/1.12]',
              '[&_figcaption]:[font-family:Georgia,_serif] [&_figcaption]:text-[21px] [&_figcaption]:leading-[1.2] [&_figcaption]:p-[18px_2px_0] [&_figcaption]:text-left',
              'max-[600px]:absolute max-[600px]:w-[35%] max-[600px]:p-[6px_6px_10px] max-[600px]:left-0 max-[600px]:top-[35px] max-[600px]:[transform:rotate(-10deg)]',
              'max-[600px]:[&_figcaption]:text-[13px] max-[600px]:[&_figcaption]:pt-2.5 max-[600px]:[&_figcaption]:hidden',
              'motion-safe:[animation:tilly-arrive-left_0.75s_ease-out_both]',
            ].join(' ')}
          >
            <HomeMedia image={images.street} ratio={1 / 1.12} />
            <figcaption>{copy['hero.street']}</figcaption>
          </figure>
          <figure
            className={[
              'tilly-device relative z-2 p-2.5 rounded-[34px] [background:#292c29] [color:#fafbf7] overflow-hidden [transform:rotate(-2deg)]',
              '[&_>_img]:block [&_>_img]:w-full [&_>_img]:aspect-[3/3.6] [&_>_img]:object-cover [&_>_img]:rounded-[17px]',
              '[&_figcaption]:grid [&_figcaption]:text-left [&_figcaption]:gap-3.5 [&_figcaption]:p-[18px_10px_16px] [&_figcaption]:text-[15px]',
              '[&_figcaption_:is(button,_a)]:[background:var(--color-tilly-accent)] [&_figcaption_:is(button,_a)]:[color:var(--color-tilly-on-signal)] [&_figcaption_:is(button,_a)]:rounded-full [&_figcaption_:is(button,_a)]:p-[12px_14px] [&_figcaption_:is(button,_a)]:min-h-11 [&_figcaption_:is(button,_a)]:cursor-pointer [&_figcaption_:is(button,_a)]:text-center [&_figcaption_:is(button,_a)]:[transition:transform_0.2s]',
              '[&_figcaption_:is(button,_a):hover]:[transform:scale(1.025)]',
              'motion-safe:[animation:tilly-arrive_0.65s_ease-out_both]',
              'max-[600px]:w-[65%] max-[600px]:m-[auto]! max-[600px]:rounded-[26px] max-[600px]:p-2',
              'max-[600px]:[&_figcaption]:p-[12px_6px_8px] max-[600px]:[&_figcaption]:text-[12px] max-[600px]:[&_figcaption]:gap-2.5',
              'max-[600px]:[&_figcaption_:is(button,_a)]:p-[10px_5px] max-[600px]:[&_figcaption_:is(button,_a)]:text-[12px]',
            ].join(' ')}
            data-ui
            aria-label={copy['hero.previewLabel']}
          >
            <div
              className={[
                'tilly-device-top flex justify-between items-center p-[13px_10px_17px] text-[20px]',
                'max-[600px]:p-[8px_8px_12px] max-[600px]:text-[17px]',
              ].join(' ')}
              aria-hidden="true"
            >
              <span>{copy['brand']}</span>
              <span>•••</span>
            </div>
            <HomeMedia image={images.cat} ratio={3 / 3.6} priority />
            <figcaption>
              <span>{copy['hero.cat']}</span>
              <a href="#friends">
                {copy['hero.friends']} <span aria-hidden="true">↗</span>
              </a>
            </figcaption>
          </figure>
          <figure
            className={[
              'tilly-encounter p-[12px_12px_18px] [background:#ebece5] [color:#191c17] tilly-encounter-art [transform:rotate(9deg)_translateY(44px)]',
              '[&_img]:w-full [&_img]:block [&_img]:object-cover [&_img]:aspect-[1/1.12] [&_img]:[object-position:50%_25%]',
              '[&_figcaption]:[font-family:Georgia,_serif] [&_figcaption]:text-[21px] [&_figcaption]:leading-[1.2] [&_figcaption]:p-[18px_2px_0] [&_figcaption]:text-left',
              'max-[600px]:absolute max-[600px]:w-[35%] max-[600px]:p-[6px_6px_10px] max-[600px]:right-0 max-[600px]:top-[85px] max-[600px]:[transform:rotate(10deg)]',
              'max-[600px]:[&_figcaption]:text-[13px] max-[600px]:[&_figcaption]:pt-2.5 max-[600px]:[&_figcaption]:hidden',
              'motion-safe:[animation:tilly-arrive-right_0.9s_ease-out_both]',
            ].join(' ')}
          >
            <HomeMedia image={images.friends} ratio={1 / 1.12} />
            <figcaption>{copy['hero.garden']}</figcaption>
          </figure>
        </div>
      </section>
      {!preview && <LiveActivity copy={copy} />}
      <section
        className={[
          'tilly-play pt-23.75 [scroll-margin-top:110px]',
          'max-[600px]:pt-18.75',
        ].join(' ')}
        id="play"
        aria-labelledby="play-title"
      >
        <div
          className={[
            'tilly-section-heading flex [align-items:end] justify-between gap-12 mb-10',
            '[&_>_p]:max-w-[36ch] [&_>_p]:m-0',
            'max-[600px]:block max-[600px]:mb-6.5',
            'max-[600px]:[&_>_p]:mt-5.5 max-[600px]:[&_>_p]:text-[17px]',
            '[&_h2]:[flex-shrink:0]',
          ].join(' ')}
        >
          <h2 id="play-title">{copy['play.title']}</h2>
          <p>
            <Lines text={copy['play.body']} />
          </p>
        </div>
        <div
          className={[
            'tilly-play-content grid [grid-template-columns:1.35fr_1fr] items-center gap-13.5',
            'max-[900px]:gap-9',
            'max-[600px]:grid max-[600px]:[grid-template-columns:1fr] max-[600px]:gap-7.5',
          ].join(' ')}
        >
          <HomeMedia
            image={images.street}
            ratio={1.12}
            className={[
              'tilly-street block w-full aspect-[1.12/1] object-cover rounded-[4px]',
              'max-[600px]:aspect-[1.15/1]',
            ].join(' ')}
          />
          <div
            className={[
              'tilly-play-copy grid gap-7.5',
              '[&_h3]:text-[21px] [&_h3]:font-medium [&_h3]:m-[0_0_8px]',
              '[&_p]:m-0 [&_p]:text-[16px]',
              'max-[600px]:gap-6.5',
            ].join(' ')}
          >
            {(['find', 'catch', 'keep'] as const).map((key) => (
              <div key={key}>
                <h3>{copy[`play.${key}.title`]}</h3>
                <p>{copy[`play.${key}.body`]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section
        className={[
          'tilly-collection grid [grid-template-columns:0.9fr_1.2fr] items-center gap-12.5 pt-37.5 [background:var(--color-tilly-brand)] [color:#ffffff] p-14.5 mt-32.5 rounded-[4px] [scroll-margin-top:50px]',
          '[&_p]:max-w-[37ch] [&_p]:m-[26px_0_0]',
          '[&_img]:block [&_img]:w-full [&_img]:aspect-[3/2] [&_img]:object-cover [&_img]:rounded-[4px]',
          'max-[900px]:gap-8 max-[900px]:p-8.75',
          'max-[600px]:grid max-[600px]:[grid-template-columns:1fr] max-[600px]:gap-7.5 max-[600px]:pt-21.25 max-[600px]:mt-21.25 max-[600px]:p-[28px_22px]',
          'max-[600px]:[&_p]:text-[17px]',
        ].join(' ')}
        id="friends"
        aria-labelledby="collection-title"
      >
        <div>
          <h2 id="collection-title">
            <Lines text={copy['friends.title']} />
          </h2>
          <p>{copy['friends.body']}</p>
          <p>{copy['friends.privacy']}</p>
        </div>
        <HomeMedia image={images.friends} ratio={1.08} />
      </section>
      <section
        className={[
          'tilly-art pt-25 [scroll-margin-top:110px] grid [grid-template-columns:1.3fr_0.7fr] items-center gap-20',
          'max-[600px]:pt-21.25 max-[600px]:[grid-template-columns:1fr] max-[600px]:gap-6.5',
          '[&_h2]:text-[36px]',
          '[&_p]:max-w-[43ch] [&_p]:text-[17px] [&_p]:m-[24px_0_0]',
          'max-[900px]:gap-10',
          'max-[600px]:[&_h2]:text-[32px]',
        ].join(' ')}
        id="art"
        aria-labelledby="art-title"
      >
        <div>
          <h2 id="art-title">{copy['art.title']}</h2>
          <p>{copy['art.body']}</p>
          <p>{copy['art.hint']}</p>
        </div>
        <figure
          className={[
            'tilly-art-preview m-[0_auto] w-full max-w-[280px]',
            '[&_img]:block [&_img]:w-full [&_img]:aspect-[3/3.4] [&_img]:object-cover',
            '[&_figcaption]:pt-3.5',
            '[&_button]:min-h-11 [&_button]:cursor-pointer [&_button]:text-left [&_button]:[color:var(--color-tilly-accent)]',
            'max-[600px]:max-w-[220px]',
          ].join(' ')}
        >
          <CatchImage
            photo={images.cat.source ?? images.cat.url}
            art={images.art.source ?? images.art.url}
            name={images.cat.alt}
          />
        </figure>
      </section>
      <section
        className={[
          'tilly-questions grid [grid-template-columns:1fr_1.12fr] gap-20 pt-37.5 [scroll-margin-top:110px]',
          '[&_details]:mb-3 [&_details]:[background:var(--site-panel)] [&_details]:p-[22px_24px]',
          '[&_summary]:cursor-pointer [&_summary]:text-[18px] [&_summary]:font-medium [&_summary]:min-h-6.5',
          '[&_details_p]:m-[18px_0_0] [&_details_p]:text-[16px]',
          'max-[900px]:gap-8.75',
          'max-[600px]:grid max-[600px]:[grid-template-columns:1fr] max-[600px]:gap-7.5 max-[600px]:pt-21.25',
          'max-[600px]:[&_details]:p-5',
          'max-[600px]:[&_summary]:text-[17px]',
        ].join(' ')}
        id="questions"
        aria-labelledby="questions-title"
      >
        <h2 id="questions-title">
          <Lines text={copy['questions.title']} />
        </h2>
        <Accordion
          type="single"
          collapsible
          className={[
            'tilly-faq',
            'motion-reduce:[&_[data-state]]:[animation:none]! motion-reduce:[&_[data-state]]:[transition:none]!',
          ].join(' ')}
        >
          {(['account', 'catch', 'sharing', 'premium', 'launch'] as const).map(
            (key) => (
              <AccordionItem
                key={key}
                value={key}
                className={[
                  'tilly-faq-item [border:0] p-[0_24px] mb-3 [background:var(--site-panel)]',
                  'max-[640px]:p-[0_20px]',
                ].join(' ')}
              >
                <AccordionTrigger
                  className={[
                    'tilly-faq-trigger p-[22px_0] text-[18px] font-medium leading-[1.45] min-h-17.5 cursor-pointer',
                    'hover:no-underline',
                    'focus-visible:[outline:2px_solid_var(--color-tilly-accent)] focus-visible:[outline-offset:4px]',
                    '[&_svg]:[color:inherit] [&_svg]:w-4.5 [&_svg]:h-4.5 [&_svg]:ml-4',
                    'max-[640px]:text-[17px] max-[640px]:p-[20px_0]',
                  ].join(' ')}
                >
                  {copy[`questions.${key}.title`]}
                </AccordionTrigger>
                <AccordionContent
                  className={[
                    'tilly-faq-content p-[0_0_22px] text-[16px] leading-[1.6]',
                    '[&_p]:m-0',
                  ].join(' ')}
                >
                  <p>{copy[`questions.${key}.body`]}</p>
                </AccordionContent>
              </AccordionItem>
            ),
          )}
        </Accordion>
      </section>
      <footer
        className={[
          'tilly-close m-[140px_0_0] flex flex-wrap justify-between items-center gap-5',
          '[&_>_p]:m-0',
          '[&_>_a]:text-[16px]',
          'max-[600px]:mt-21.25',
          'max-[600px]:[&_>_p]:text-[16px]',
          'max-[600px]:[&_>_a]:text-[14px]',
        ].join(' ')}
      >
        <p>{copy['footer.title']}</p>
        <a href="https://github.com/mattblr/tilly">
          {copy['footer.source']} <span aria-hidden="true">↗</span>
        </a>
        <span
          className={[
            "tilly-signature [font-family:Georgia,_'Times_New_Roman',_serif] font-normal tracking-[-0.055em] block w-full text-[clamp(150px,_31vw,_390px)] leading-[1.1] text-center",
            'max-[600px]:text-[39vw]',
          ].join(' ')}
          aria-hidden="true"
        >
          {copy['brand']}
        </span>
      </footer>
    </main>
  )
}
