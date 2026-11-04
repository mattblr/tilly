/**
 * Fóir CMS schema for navigation, cookie consent and public content pages.
 * A page keeps prose and placed media in its blocks flow. The app homepage
 * is implemented in the website route; legal and editorial pages use this CMS.
 */

import { defineConfig } from '@foir/cli/configs';

export default defineConfig({
  key: 'tilly-project',
  name: 'Tilly',
  description:
    'Content models for the Tilly marketing site (pages, menus, SEO, media).',

  models: [
    // -- page -----------------------------------------------------
    {
      key: 'page',
      name: 'Page',
      pluralName: 'Pages',
      description:
        'A CMS page. `home` supplies homepage SEO and illustrations; other keys (terms, privacy) are richtext content pages.',
      // The site reads this with its public key, and a public key reads only
      // rows marked public.
      access: { ownerPlane: 'project', defaultVisibility: 'public' },
      fields: [
        {
          key: 'title',
          type: 'text',
          label: 'Title',
          required: true,
          helpText:
            'Display title / page heading. SEO meta title falls back to this.',
        },
        {
          key: 'blocks',
          type: 'prose',
          label: 'Page Blocks',
          required: false,
          helpText:
            'Page body — prose with content and media blocks placed between passages.',
          config: {
            allowedTypes: ['content', 'editorial_media'],
          },
        },
        {
          key: 'seo',
          type: 'seo',
          label: 'SEO',
          required: false,
          helpText: 'SEO and social sharing metadata.',
        },
      ],
      config: {
        publicApi: true,
        publishing: true,
        versioning: true,
        variants: true,
        customerScoped: false,
        category: 'Tilly',
      },
    },

    // -- cta (inline block) ---------------------------------------
    {
      key: 'cta',
      name: 'CTA',
      pluralName: 'CTAs',
      description:
        'Call-to-action link. Attached to a `content` block via its CTAs list.',
      fields: [
        { key: 'label', type: 'text', label: 'Label', required: true },
        {
          key: 'pageRef',
          type: 'reference',
          label: 'Page Reference',
          required: false,
          helpText:
            'Link to a CMS page. Takes priority over the Link URL when both are set.',
          config: {
            multiple: false,
            referenceTypes: ['page'],
          },
        },
        {
          key: 'href',
          type: 'text',
          label: 'Link URL',
          required: false,
          helpText:
            'External URL or hand-authored path. Used when no Page Reference is set.',
        },
        {
          key: 'variant',
          type: 'enum',
          label: 'Variant',
          required: false,
          config: {
            options: [
              { label: 'Solid', value: 'solid' },
              { label: 'Outline', value: 'outline' },
              { label: 'Link', value: 'link' },
            ],
          },
        },
        {
          key: 'openInNewTab',
          type: 'boolean',
          label: 'Open in New Tab',
          required: false,
        },
      ],
      config: {
        inline: true,
        records: false,
        publicApi: true,
        category: 'Primitives',
      },
    },

    // -- content (inline block) -----------------------------------
    {
      key: 'content',
      name: 'Content',
      pluralName: 'Content Blocks',
      description:
        'Editorial content primitive — prose richtext + optional CTAs. Used standalone in a page (the homepage text) or as the overlay content on a media block.',
      fields: [
        {
          key: 'richtext',
          type: 'prose',
          label: 'Content',
          required: false,
          helpText: 'Prose content.',
        },
        {
          key: 'ctas',
          type: 'list',
          label: 'CTAs',
          required: false,
          helpText: 'Optional call-to-action links.',
          config: {
            itemSchema: 'cta',
          },
        },
        {
          key: 'ctaLayout',
          type: 'enum',
          label: 'CTA Layout',
          required: false,
          helpText:
            'Direction CTAs stack at ≥768px. Mobile always stacks vertically.',
          config: {
            options: [
              { label: 'Row', value: 'row' },
              { label: 'Column', value: 'column' },
            ],
          },
        },
        {
          key: 'align',
          type: 'enum',
          label: 'Alignment',
          required: false,
          helpText: 'Horizontal alignment of the content stack.',
          config: {
            options: [
              { label: 'Start', value: 'start' },
              { label: 'Center', value: 'center' },
              { label: 'End', value: 'end' },
            ],
          },
        },
      ],
      config: {
        inline: true,
        records: false,
        publicApi: true,
        category: 'Blocks',
      },
    },

    // -- media_image (inline block) -------------------------------
    {
      key: 'media_image',
      name: 'Image',
      pluralName: 'Images',
      description:
        'Image pair for a media block — desktop and mobile sources. Grouped so the admin sidebar collapses both viewports into a single editable section.',
      fields: [
        {
          key: 'desktop',
          type: 'image',
          label: 'Desktop',
          required: false,
          helpText: 'Used at ≥768px when no video is set.',
        },
        {
          key: 'mobile',
          type: 'image',
          label: 'Mobile',
          required: false,
          helpText: 'Used at <768px when set; falls back to Desktop.',
        },
      ],
      config: {
        inline: true,
        records: false,
        publicApi: true,
        category: 'Primitives',
      },
    },

    // -- media_video (inline block) -------------------------------
    {
      key: 'media_video',
      name: 'Video',
      pluralName: 'Videos',
      description:
        'Video pair for a media block — desktop and mobile sources. Takes priority over the matching Image at the same breakpoint.',
      fields: [
        {
          key: 'desktop',
          type: 'video',
          label: 'Desktop',
          required: false,
          helpText:
            'Takes priority over the desktop image at ≥768px when both are set.',
        },
        {
          key: 'mobile',
          type: 'video',
          label: 'Mobile',
          required: false,
          helpText:
            'Used at <768px when set; falls back to Desktop Video, then Mobile Image, then Desktop Image.',
        },
      ],
      config: {
        inline: true,
        records: false,
        publicApi: true,
        category: 'Primitives',
      },
    },

    // -- media_config (inline block) ------------------------------
    {
      key: 'media_config',
      name: 'Media Config',
      pluralName: 'Media Configs',
      description:
        'Playback + fit + alt text for a media block. Groups the video-only fields (autoplay / muted / loop) with the fit control.',
      fields: [
        {
          key: 'alt',
          type: 'text',
          label: 'Alt Text',
          required: false,
          helpText:
            'Override accessibility text. Defaults to the image alt when empty.',
        },
        {
          key: 'fit',
          type: 'enum',
          label: 'Object Fit',
          required: false,
          helpText:
            "How the media fills its container. Cover crops to fill; Contain renders at the file's natural aspect ratio.",
          config: {
            options: [
              {
                label: 'Contain (render at native aspect ratio)',
                value: 'contain',
              },
              {
                label: 'Cover (fill the container, crop overflow)',
                value: 'cover',
              },
            ],
          },
        },
        {
          key: 'autoplay',
          type: 'boolean',
          label: 'Autoplay',
          required: false,
          helpText:
            'Start the video on mount. Browser policy requires muted for autoplay, so Muted is forced on when this is set.',
        },
        {
          key: 'muted',
          type: 'boolean',
          label: 'Muted',
          required: false,
          helpText: 'Mute audio. Required when Autoplay is on.',
        },
        {
          key: 'loop',
          type: 'boolean',
          label: 'Loop',
          required: false,
          helpText: 'Loop the video when it ends.',
        },
      ],
      config: {
        inline: true,
        records: false,
        publicApi: true,
        category: 'Primitives',
      },
    },

    // -- overlay_settings (inline block) --------------------------
    {
      key: 'overlay_settings',
      name: 'Overlay Settings',
      pluralName: 'Overlay Settings',
      description:
        'Presentation-only overlay settings — position, theme, scrim. Extracted as its own model so adding a presentation knob is a one-place edit.',
      fields: [
        {
          key: 'position',
          type: 'enum',
          label: 'Position',
          required: false,
          helpText: 'Where the overlay anchors within the media frame.',
          config: {
            options: [
              { label: 'Top Left', value: 'top_left' },
              { label: 'Top Center', value: 'top_center' },
              { label: 'Top Right', value: 'top_right' },
              { label: 'Center', value: 'center' },
              { label: 'Bottom Left', value: 'bottom_left' },
              { label: 'Bottom Center', value: 'bottom_center' },
              { label: 'Bottom Right', value: 'bottom_right' },
            ],
          },
        },
        {
          key: 'theme',
          type: 'enum',
          label: 'Theme',
          required: false,
          helpText:
            'Light = white text (use over dark media). Dark = black text (use over light media).',
          config: {
            options: [
              { label: 'Light', value: 'light' },
              { label: 'Dark', value: 'dark' },
            ],
          },
        },
        {
          key: 'scrimColor',
          type: 'enum',
          label: 'Scrim Colour',
          required: false,
          helpText:
            'Colour of the scrim applied across the media. Independent of Theme — Theme controls overlay text colour only.',
          config: {
            options: [
              { label: 'Dark (black tint)', value: 'dark' },
              { label: 'Light (white tint)', value: 'light' },
            ],
          },
        },
        {
          key: 'scrimOpacity',
          type: 'decimal',
          label: 'Scrim Opacity',
          required: false,
          helpText:
            'Strength of the scrim (0–100). Use to darken or lighten a busy image so an overlay heading reads cleanly.',
        },
      ],
      config: {
        inline: true,
        records: false,
        publicApi: true,
        category: 'Primitives',
      },
    },

    // -- media_overlay (inline block) -----------------------------
    {
      key: 'media_overlay',
      name: 'Media Overlay',
      pluralName: 'Media Overlays',
      description:
        'Optional content overlay anchored above the media surface — prose + CTAs, plus presentation settings (position / theme / scrim).',
      fields: [
        {
          key: 'content',
          type: 'content',
          label: 'Content',
          required: false,
          helpText: 'Editorial content + CTAs rendered on top of the media.',
        },
        {
          key: 'settings',
          type: 'overlay_settings',
          label: 'Settings',
          required: false,
          helpText: 'Position, theme, scrim colour, scrim opacity.',
        },
      ],
      config: {
        inline: true,
        records: false,
        publicApi: true,
        category: 'Primitives',
      },
    },

    // -- editorial_media (inline block) ---------------------------
    // Keyed `editorial_media`, not `media`: the platform reserves `media` for
    // its built-in file primitive (`MediaBlock` — url / blurhash / variants /
    // hlsManifestUrl), and pushing a `media` model is rejected as a public-schema
    // collision. The editor-facing name stays "Media"; only the key and the
    // generated GraphQL type (`EditorialMediaBlock`) differ from shared CMS.
    {
      key: 'editorial_media',
      name: 'Media',
      pluralName: 'Media Blocks',
      description:
        'Editorial media primitive — image or video, with an optional content overlay. When a Link is set the media becomes a clickable card.',
      fields: [
        {
          key: 'image',
          type: 'media_image',
          label: 'Image',
          required: false,
          helpText:
            'Desktop + mobile image sources. Used when no matching video is set at the same breakpoint.',
        },
        {
          key: 'video',
          type: 'media_video',
          label: 'Video',
          required: false,
          helpText:
            'Desktop + mobile video sources. Takes priority over the matching image.',
        },
        {
          key: 'config',
          type: 'media_config',
          label: 'Config',
          required: false,
          helpText:
            'Alt text, object fit, and video playback flags (autoplay / muted / loop).',
        },
        {
          key: 'overlay',
          type: 'media_overlay',
          label: 'Overlay',
          required: false,
          helpText:
            'Optional content overlay (prose + CTAs) with scrim + theme controls.',
        },
        {
          key: 'linkRef',
          type: 'reference',
          label: 'Link — Reference',
          required: false,
          helpText:
            'Optional. When set, the media becomes a clickable card linking to this page. Takes priority over Link URL.',
          config: {
            multiple: false,
            referenceTypes: ['page'],
          },
        },
        {
          key: 'linkUrl',
          type: 'text',
          label: 'Link — URL',
          required: false,
          helpText:
            'Optional. External URL or hand-authored path. Used when no Link Reference is set.',
        },
        {
          key: 'linkOpenInNewTab',
          type: 'boolean',
          label: 'Link — Open in New Tab',
          required: false,
          helpText: 'Whether to open the link in a new browser tab.',
        },
      ],
      config: {
        inline: true,
        records: false,
        publicApi: true,
        category: 'Blocks',
      },
    },

    // -- seo (inline block) ---------------------------------------
    {
      key: 'seo',
      name: 'SEO',
      pluralName: 'SEO',
      description: 'SEO and social sharing metadata for a page.',
      fields: [
        {
          key: 'metaTitle',
          type: 'text',
          label: 'Meta Title',
          helpText: 'Browser tab title. Falls back to page title if empty.',
        },
        {
          key: 'metaDescription',
          type: 'text',
          label: 'Meta Description',
          helpText:
            'Search engine description snippet (150-160 chars recommended).',
        },
        {
          key: 'canonicalUrl',
          type: 'text',
          label: 'Canonical URL',
          helpText:
            'Canonical URL override. Auto-generated from slug if empty.',
        },
        {
          key: 'robots',
          type: 'text',
          label: 'Robots',
          helpText:
            'Robots directive (e.g. "index, follow" or "noindex, nofollow").',
        },
        {
          key: 'ogTitle',
          type: 'text',
          label: 'OG Title',
          helpText: 'Open Graph title. Falls back to metaTitle then title.',
        },
        {
          key: 'ogDescription',
          type: 'text',
          label: 'OG Description',
          helpText: 'Open Graph description. Falls back to metaDescription.',
        },
        {
          key: 'ogImage',
          type: 'image',
          label: 'OG Image',
          helpText: 'Social sharing image (1200x630 recommended).',
        },
        {
          key: 'ogType',
          type: 'text',
          label: 'OG Type',
          helpText:
            'Open Graph type (e.g. "website", "article"). Defaults to "website".',
        },
        {
          key: 'twitterCard',
          type: 'text',
          label: 'Twitter Card Type',
          helpText:
            '"summary", "summary_large_image", etc. Defaults to "summary_large_image".',
        },
        {
          key: 'twitterTitle',
          type: 'text',
          label: 'Twitter Title',
          helpText:
            'Twitter card title. Falls back to ogTitle, metaTitle, then title.',
        },
        {
          key: 'twitterDescription',
          type: 'text',
          label: 'Twitter Description',
          helpText:
            'Twitter card description. Falls back to ogDescription then metaDescription.',
        },
        {
          key: 'twitterImage',
          type: 'image',
          label: 'Twitter Image',
          helpText: 'Twitter card image. Falls back to ogImage.',
        },
        {
          key: 'jsonLd',
          type: 'text',
          label: 'JSON-LD',
          helpText: 'JSON-LD structured data as a JSON string.',
        },
      ],
      config: {
        inline: true,
        records: false,
        publicApi: true,
        category: 'Tilly',
      },
    },

    // -- menu -----------------------------------------------------
    {
      key: 'menu',
      name: 'Menu',
      pluralName: 'Menus',
      description:
        'A navigation menu of nestable items. Seeded as main-nav, footer, footer-meta.',
      // The site reads this with its public key, and a public key reads only
      // rows marked public.
      access: { ownerPlane: 'project', defaultVisibility: 'public' },
      fields: [
        {
          key: 'title',
          type: 'text',
          label: 'Title',
          required: true,
          helpText: 'Internal name for this menu (e.g. Main Nav, Footer).',
        },
        {
          key: 'items',
          type: 'list',
          label: 'Menu Items',
          required: false,
          helpText: 'Top-level menu items (optional — a menu may have none).',
          config: {
            itemSchema: 'menu_item',
          },
        },
      ],
      config: {
        publicApi: true,
        publishing: true,
        versioning: true,
        customerScoped: false,
        category: 'Tilly',
      },
    },

    // -- menu_item (inline block) ---------------------------------
    {
      key: 'menu_item',
      name: 'Menu Item',
      pluralName: 'Menu Items',
      description:
        'A single navigation menu item, optionally nested via children.',
      fields: [
        {
          key: 'label',
          type: 'text',
          label: 'Label',
          required: false,
          helpText:
            'Display text. Optional — a footer item with only children renders as a headless column.',
        },
        {
          key: 'url',
          type: 'text',
          label: 'URL',
          required: false,
          helpText: 'Link URL (absolute or relative path like /terms).',
        },
        {
          key: 'pageRef',
          type: 'reference',
          label: 'Page',
          required: false,
          helpText: 'Link to a CMS page instead of a URL.',
          config: { multiple: false, referenceTypes: ['page'] },
        },
        {
          key: 'openInNewTab',
          type: 'boolean',
          label: 'Open in New Tab',
          required: false,
          helpText: 'Open link in a new browser tab.',
        },
        {
          key: 'children',
          type: 'list',
          label: 'Children',
          required: false,
          helpText: 'Nested sub-menu items.',
          config: {
            itemSchema: 'menu_item',
          },
        },
      ],
      config: {
        inline: true,
        records: false,
        publicApi: true,
        category: 'Tilly',
      },
    },

    // -- cookie_consent -------------------------------------------
    {
      key: 'cookie_consent',
      name: 'Cookie Consent',
      pluralName: 'Cookie Consents',
      description: 'Cookie consent banner and preferences modal copy.',
      // The site reads this with its public key, and a public key reads only
      // rows marked public.
      access: { ownerPlane: 'project', defaultVisibility: 'public' },
      fields: [
        {
          key: 'consentTitle',
          type: 'text',
          label: 'Consent Title',
          required: true,
          helpText: 'Title shown in the consent modal.',
        },
        {
          key: 'consentDescription',
          type: 'text',
          label: 'Consent Description',
          required: true,
          helpText: 'Description shown in the consent modal.',
        },
        {
          key: 'acceptAllLabel',
          type: 'text',
          label: 'Accept All Label',
          required: true,
          helpText: 'Text for the "Accept all" button.',
        },
        {
          key: 'rejectAllLabel',
          type: 'text',
          label: 'Reject All Label',
          required: true,
          helpText: 'Text for the "Reject all" button.',
        },
        {
          key: 'manageLabel',
          type: 'text',
          label: 'Manage Label',
          required: true,
          helpText: 'Text for the "Manage preferences" button.',
        },
        {
          key: 'preferencesTitle',
          type: 'text',
          label: 'Preferences Title',
          required: true,
          helpText: 'Title shown in the preferences modal.',
        },
        {
          key: 'saveLabel',
          type: 'text',
          label: 'Save Label',
          required: true,
          helpText: 'Text for the "Save preferences" button.',
        },
        {
          key: 'sections',
          type: 'list',
          label: 'Sections',
          required: true,
          helpText: 'Cookie category sections shown in the preferences modal.',
          config: {
            minItems: 1,
            itemSchema: 'cookie_section',
          },
        },
      ],
      config: {
        publicApi: true,
        publishing: true,
        versioning: true,
        customerScoped: false,
        category: 'Tilly',
      },
    },

    // -- cookie_section (inline block) ----------------------------
    {
      key: 'cookie_section',
      name: 'Cookie Section',
      pluralName: 'Cookie Sections',
      description:
        'A section in the cookie preferences modal, optionally linked to a consent category.',
      fields: [
        {
          key: 'title',
          type: 'text',
          label: 'Title',
          required: true,
          helpText: 'Section heading (e.g. "Strictly necessary", "Analytics").',
        },
        {
          key: 'description',
          type: 'text',
          label: 'Description',
          required: true,
          helpText: 'Explanation shown to the user for this section.',
        },
        {
          key: 'categoryKey',
          type: 'text',
          label: 'Category Key',
          required: false,
          helpText:
            'vanilla-cookieconsent category key (e.g. "necessary", "analytics"). Leave empty for info-only sections.',
        },
        {
          key: 'enabled',
          type: 'boolean',
          label: 'Enabled',
          required: false,
          helpText: 'Whether this category is enabled by default.',
        },
        {
          key: 'readOnly',
          type: 'boolean',
          label: 'Read Only',
          required: false,
          helpText: 'Whether the user can toggle this category off.',
        },
      ],
      config: {
        inline: true,
        records: false,
        publicApi: true,
        category: 'Tilly',
      },
    },
  ],
});
