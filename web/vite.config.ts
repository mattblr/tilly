import { defineConfig, loadEnv } from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { cloudflare } from '@cloudflare/vite-plugin'

export default defineConfig(({ mode }) => ({
  envDir: '..',
  // The site's own origin (the root config's TILLY_SITE_URL), for canonical links.
  define: {
    'import.meta.env.TILLY_SITE_URL': JSON.stringify(
      process.env.TILLY_SITE_URL || loadEnv(mode, '..', 'TILLY_').TILLY_SITE_URL || '',
    ),
  },
  server: {
    port: 3000,
  },
  plugins: [
    tsConfigPaths(),
    tanstackStart({ server: { entry: './server.ts' } }),
    viteReact(),
    tailwindcss(),
    cloudflare({
      viteEnvironment: {
        name: 'ssr',
      },
    }),
  ],
}))
