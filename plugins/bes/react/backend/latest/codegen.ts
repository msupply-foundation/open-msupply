import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'http://localhost:8000/graphql',
  overwrite: true,
  documents: '../**/*.graphql',
  generates: {
    'codegenTypes.ts': {
      plugins: ['typescript'],
      config: {
        preResolveTypes: true,
        onlyOperations: true,
        scalars: {
          DateTime: {
            input: 'string',
            output: 'string',
          },
          NaiveDate: {
            input: 'string',
            output: 'string',
          },
          NaiveDateTime: {
            input: 'string',
            output: 'string',
          },
        },
      },
    },
    './src/generated-types/graphql.ts': {
      preset: 'import-types',
      plugins: ['typescript-operations'],
      presetConfig: {
        typesPath: '../../codegenTypes',
      },
      config: {},
    },
  },
};

export default config;
