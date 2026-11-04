import { CopyText } from '~/components/CopyText'
import { resolveAppCopy, formatAppCopy } from '~/features/app/copy'
import appCss from '~/styles/app.css?url'
import { createFileRoute } from '@tanstack/react-router'
import { ConsolePlacement } from '~/features/console/ConsolePlacement'
export const Route = createFileRoute('/_foir/apps/tilly/admin')({
  ssr: false,
  head: () => ({
    meta: [
      { title: formatAppCopy(resolveAppCopy([]), 'website.consoleTitle') },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  pendingComponent: () => (
    <main
      className={[
        "foir-console [--background:#fff] [--foreground:#242521] [--muted:#f5f5f2] [--muted-foreground:#62655e] [--border:#e8e9e4] [--input:#d7d9d1] [--ring:#54765e] [--destructive:#a9312b] [font-family:-apple-system,_BlinkMacSystemFont,_'Segoe_UI',_sans-serif] [color-scheme:light] min-h-dvh m-[0_auto] [background:var(--background)] [color:var(--foreground)] text-[14px] leading-[1.45] [-webkit-font-smoothing:antialiased] max-w-[1320px] p-[24px_28px_64px] [--card:var(--background)] [--card-foreground:var(--foreground)] [--popover:var(--background)] [--popover-foreground:var(--foreground)] [--primary:var(--foreground)] [--primary-foreground:var(--background)] [--secondary:var(--muted)] [--secondary-foreground:var(--foreground)] [--accent:var(--muted)] [--accent-foreground:var(--foreground)] [--radius:8px]",
        '[html.dark_&]:[--background:#181a17] [html.dark_&]:[--foreground:#edeee9] [html.dark_&]:[--muted:#242720] [html.dark_&]:[--muted-foreground:#a7aca0] [html.dark_&]:[--border:#33382e] [html.dark_&]:[--input:#4c5344] [html.dark_&]:[--ring:#a2b8a4] [html.dark_&]:[--destructive:#f5998f] [html.dark_&]:[color-scheme:dark]',
        '[&_*]:box-border',
        '[&_button]:[font:inherit] [&_button]:cursor-pointer',
        '[&_input]:[font:inherit]',
        '[&_textarea]:[font:inherit]',
        '[&_button:disabled]:[cursor:default]',
        '[&_h1]:text-[20px] [&_h1]:font-semibold [&_h1]:tracking-[-0.025em] [&_h1]:m-0',
        '[&_h2]:text-[14px] [&_h2]:font-semibold [&_h2]:m-0',
        '[&_h3]:text-[12px] [&_h3]:font-medium [&_h3]:m-[0_0_6px]',
        '[&_table]:w-full [&_table]:[border-collapse:collapse] [&_table]:text-left [&_table]:text-[13px]',
        '[&_th]:text-[12px] [&_th]:font-medium [&_th]:[color:var(--muted-foreground)] [&_th]:p-[10px_16px_10px_0] [&_th]:[border-bottom:1px_solid_var(--border)] [&_th]:whitespace-nowrap',
        '[&_td]:p-[15px_16px_15px_0] [&_td]:[border-bottom:1px_solid_var(--border)]',
        '[&_td_strong]:font-medium',
        '[&_td_small]:block [&_td_small]:[color:var(--muted-foreground)] [&_td_small]:text-[12px] [&_td_small]:mt-0.75',
        '[&_td:last-child]:text-right [&_td:last-child]:pr-[0]',
        'max-[760px]:p-[20px_20px_48px]',
        'max-[420px]:px-4',
        'motion-reduce:[&_*]:[animation-duration:0.01ms]! motion-reduce:[&_*]:[transition-duration:0.01ms]!',
        'motion-reduce:[&_*::before]:[animation-duration:0.01ms]! motion-reduce:[&_*::before]:[transition-duration:0.01ms]!',
        'motion-reduce:[&_*::after]:[animation-duration:0.01ms]! motion-reduce:[&_*::after]:[transition-duration:0.01ms]!',
      ].join(' ')}
    >
      <p role="status"><CopyText name="website.consoleConnecting" /></p>
    </main>
  ),
  component: ConsolePlacement,
})
