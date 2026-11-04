import type { CodegenConfig } from '@graphql-codegen/cli'

// The site's own publishable key (VITE_PLATFORM_API_KEY) introspects the schema it
// reads, so the types are generated from exactly what the site is served.
const config: CodegenConfig = {
  schema: [
    {
      [process.env.VITE_PLATFORM_API_URL || 'https://api.foir.dev/graphql']: {
        headers: {
          'x-api-key': process.env.VITE_PLATFORM_API_KEY || '',
        },
      },
    },
  ],
  documents: 'src/lib/content.graphql',
  ignoreNoDocuments: true,
  generates: {
    './src/generated/foir.content.generated.ts': {
      plugins: ['typescript', 'typescript-operations', 'typed-document-node'],
      config: {
        useTypeImports: true,
        onlyOperationTypes: true,
        // Keep GraphQL enum value names as-authored. The default `pascalCase`
        // strips the leading underscore the platform adds when sanitising
        // digit-leading values (e.g. `_1` → `1`), producing TS enum members
        // with numeric names — a syntax error. Matches shared CMS.
        namingConvention: {
          enumValues: 'keep',
        },
        scalars: {
          JSON: '{ [key: string]: any }',
          DateTime: 'string',
        },
      },
    },
  },
}

export default config
