import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'http://localhost:8000/graphql',
  documents: '../**/*.graphql',
  generates: {
    './src/generated-types/graphql.ts': {
      preset: 'import-types',
      plugins: ['typescript-operations'], // 'typescript'],
      presetConfig: {
        typesPath: '../../codegenTypes.ts',
      },
      config: {
        preResolveTypes: true,
        onlyOperationTypes: true,
      },
    },
  },
};
export default config;
