/* eslint-disable camelcase */
import { BackendPlugins } from '@common/types';

type Graphql = {
  input: { type: 'echo'; echo: string } | { type: 'doubleEcho'; echo: string };
  output: { type: 'echo'; echo: string } | { type: 'doubleEcho'; echo: string };
};

const plugins: BackendPlugins = {
  graphql_query: ({ store_id, input: inputUntyped }): Graphql['output'] => {
    const input = inputUntyped as Graphql['input'];

    switch (input.type) {
      case 'echo':
        return { type: 'echo', echo: input.echo };
      case 'doubleEcho':
        use_graphql({
          query: `
              query MyQuery($input: JSON = "", $pluginCode: String = "", $storeId: String = "") {
                pluginGraphqlQuery(input: $input, pluginCode: $pluginCode, storeId: $storeId)
              }
          `,
          variables: {
            storeId: store_id,
            input: { type: 'echo', echo: 'yow' },
            pluginCode: 'plugin_examples',
          },
        });
        return {
          type: 'doubleEcho',
          echo: input.echo,
        };
    }
  },
};

export { plugins };
