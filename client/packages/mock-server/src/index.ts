require('graphql-import-node/register');
import { loadSchemaSync } from '@graphql-tools/load';

import { UrlLoader } from '@graphql-tools/url-loader';
import { ApolloServer } from 'apollo-server';
import { Schema } from './schema';
import { mergeTypeDefs } from '@graphql-tools/merge';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const typeDefs2 = require('@openmsupply-client/common/src/additions.schema.graphql');
const remoteSchema = loadSchemaSync(
  'https://demo-open.msupply.org:8000/graphql',
  {
    loaders: [new UrlLoader()],
  }
);
const typeDefs = mergeTypeDefs([remoteSchema, typeDefs2]);

const resolvers = {
  Queries: {
    ...Schema.Name.QueryResolvers,
    ...Schema.Item.QueryResolvers,
    ...Schema.Invoice.QueryResolvers,
    ...Schema.StockLine.QueryResolvers,
    ...Schema.Statistics.QueryResolvers,
    ...Schema.Requisition.QueryResolvers,
    ...Schema.Stocktake.QueryResolvers,
    ...Schema.Location.QueryResolvers,
  },
  Mutations: {
    ...Schema.Invoice.MutationResolvers,
    ...Schema.Requisition.MutationResolvers,
    ...Schema.Stocktake.MutationResolvers,
    ...Schema.Location.MutationResolvers,
  },
};

const server = new ApolloServer({ typeDefs, resolvers });
server.listen().then(({ url }) => {
  console.log(
    `🚀🚀🚀 Server   @ ${url}         🚀🚀🚀\n🤖🤖🤖 GraphiQL @ ${url}graphiql 🤖🤖🤖`
  );
});
