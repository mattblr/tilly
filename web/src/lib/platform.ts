import type {
  GetPageQuery,
  GetMenuQuery,
  GetCookieConsentQuery,
  ContentFieldsFragment,
} from '~/generated/foir.content.generated';

// --- Derived types from codegen ---

export type PageData = NonNullable<GetPageQuery['page']>;
/** One entry of the page's prose flow — a passage or a placed block. */
export type PageBlock = NonNullable<
  NonNullable<NonNullable<PageData['blocks']>['entries']>[number]
>;
export type Seo = NonNullable<PageData['seo']>;
export type MenuData = NonNullable<GetMenuQuery['menu']>;
export type NavItem = NonNullable<NonNullable<MenuData['items']>[number]>;
export type CookieConsentData = NonNullable<
  GetCookieConsentQuery['cookieConsent']
>;
export type CookieSection = NonNullable<
  NonNullable<CookieConsentData['sections']>[number]
>;

// --- Block types ---

export type PassageBlock = Extract<PageBlock, { __typename: 'Passage' }>;
export type MediaBlockData = Extract<
  PageBlock,
  { __typename: 'EditorialMedia' }
>;
export type ContentBlockData = Extract<PageBlock, { __typename: 'Content' }>;

/** The `content` inline model projects as one `Content` type everywhere —
 * page-level block and media overlay slot alike. */
export type ContentLike = ContentFieldsFragment;
export type Cta = NonNullable<NonNullable<ContentLike['ctas']>[number]>;

// --- Link Helpers ---

/**
 * Path for a referenced page. Pages are flat (`/<naturalKey>`), except `home`
 * which is the site root.
 */
export function pagePath(
  ref: { _naturalKey?: string | null } | null | undefined,
): string | null {
  const key = ref?._naturalKey;
  if (!key) return null;
  return key === 'home' ? '/' : `/${key}`;
}

// --- SEO Helpers ---

interface MetaTag {
  title?: string;
  name?: string;
  property?: string;
  content?: string;
}

export function buildSeoMeta(
  seo: Seo | null | undefined,
  pageTitle?: string | null,
  defaults?: { title: string; description: string },
): MetaTag[] {
  const fallbackTitle = defaults?.title ?? 'Tilly';
  const fallbackDesc = defaults?.description ?? '';

  const title = seo?.metaTitle || pageTitle || fallbackTitle;
  const description = seo?.metaDescription || fallbackDesc;
  const ogTitle = seo?.ogTitle || seo?.metaTitle || pageTitle || fallbackTitle;
  const ogDesc = seo?.ogDescription || seo?.metaDescription || fallbackDesc;
  const twTitle = seo?.twitterTitle || ogTitle;
  const twDesc = seo?.twitterDescription || ogDesc;

  const ogImageUrl = seo?.ogImage?.url;
  const twImageUrl = seo?.twitterImage?.url || ogImageUrl;

  const meta: MetaTag[] = [
    { title },
    { name: 'description', content: description },
  ];

  if (seo?.robots) meta.push({ name: 'robots', content: seo.robots });

  meta.push({ property: 'og:title', content: ogTitle });
  meta.push({ property: 'og:description', content: ogDesc });
  meta.push({ property: 'og:type', content: seo?.ogType || 'website' });

  if (ogImageUrl) {
    meta.push({ property: 'og:image', content: ogImageUrl });
    if (seo?.ogImage?.width)
      meta.push({
        property: 'og:image:width',
        content: String(seo.ogImage.width),
      });
    if (seo?.ogImage?.height)
      meta.push({
        property: 'og:image:height',
        content: String(seo.ogImage.height),
      });
    if (seo?.ogImage?.alt)
      meta.push({ property: 'og:image:alt', content: seo.ogImage.alt });
  }

  meta.push({
    name: 'twitter:card',
    content: seo?.twitterCard || 'summary_large_image',
  });
  meta.push({ name: 'twitter:title', content: twTitle });
  meta.push({ name: 'twitter:description', content: twDesc });
  if (twImageUrl) meta.push({ name: 'twitter:image', content: twImageUrl });

  return meta;
}

// --- Link Builder ---

interface LinkTag {
  rel: string;
  href: string;
}

export function buildSeoLinks(
  seo: Seo | null | undefined,
  path?: string,
): LinkTag[] {
  const links: LinkTag[] = [];
  const site = import.meta.env?.TILLY_SITE_URL;
  const canonical =
    seo?.canonicalUrl || (path && site ? `${site}${path}` : undefined);
  if (canonical) links.push({ rel: 'canonical', href: canonical });
  return links;
}
