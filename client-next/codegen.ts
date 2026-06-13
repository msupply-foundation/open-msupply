import type { CodegenConfig } from '@graphql-codegen/cli';

// Schema is committed by the server (regenerated there via `cargo run --bin
// remote_server_cli -- export-graphql-schema`). We consume the SDL directly — no
// running server needed to generate client types.
const scalars = {
  DateTime: 'string',
  NaiveDate: 'string',
  NaiveDateTime: 'string',
};

const config: CodegenConfig = {
  overwrite: true,
  // Tolerate having no *.graphql operations yet (none until features are built).
  ignoreNoDocuments: true,
  schema: '../server/schema.graphql',
  generates: {
    // Shared base types for the whole schema.
    './src/gql/schema.ts': {
      plugins: ['typescript'],
      config: { nonOptionalTypename: true, scalars },
    },
    // Per-operation types + typed SDK, colocated next to each *.graphql document.
    './src/': {
      documents: ['./src/**/*.graphql'],
      preset: 'near-operation-file',
      presetConfig: {
        extension: '.generated.ts',
        baseTypesPath: 'gql/schema.ts',
      },
      plugins: ['typescript-operations', 'typescript-graphql-request'],
      config: { nonOptionalTypename: true, scalars },
    },
  },
  hooks: { afterAllFileWrite: ['prettier --write'] },
};

export default config;
