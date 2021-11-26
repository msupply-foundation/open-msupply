require('graphql-import-node/register');

import { ApolloServer } from 'apollo-server';
import { Schema } from './schema';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const typeDefs = require('@openmsupply-client/common/src/schema.graphql');

const resolvers = {
  Queries: {
    ...Schema.Name.QueryResolvers,
    ...Schema.Item.QueryResolvers,
    ...Schema.Invoice.QueryResolvers,
    ...Schema.InvoiceLine.QueryResolvers,
    ...Schema.StockLine.QueryResolvers,
    ...Schema.Statistics.QueryResolvers,
    ...Schema.Requisition.QueryResolvers,
  },
  Mutations: {
    ...Schema.Invoice.MutationResolvers,
    ...Schema.InvoiceLine.MutationResolvers,
    ...Schema.Requisition.MutationResolvers,
  },
};

const server = new ApolloServer({ typeDefs, resolvers });

server.listen().then(({ url }) => {
  console.log(
    `🚀🚀🚀 Server   @ ${url}         🚀🚀🚀\n🤖🤖🤖 GraphiQL @ ${url}graphiql 🤖🤖🤖`
  );
});

export { handlers } from './worker/handlers';
