import { ApolloServer } from 'apollo-server';
import { Schema } from './schema';
import schema from './full-schema';

const resolvers = {
  Queries: {
    ...Schema.Name.QueryResolvers,
    ...Schema.Item.QueryResolvers,
    ...Schema.Invoice.QueryResolvers,
    ...Schema.InvoiceLine.QueryResolvers,
    ...Schema.StockLine.QueryResolvers,
  },
  Mutations: {
    ...Schema.Invoice.MutationResolvers,
    ...Schema.InvoiceLine.MutationResolvers,
  },
};

const server = new ApolloServer({ typeDefs: schema, resolvers });

server.listen().then(({ url }) => {
  console.log(
    `🚀🚀🚀 Server   @ ${url}         🚀🚀🚀\n🤖🤖🤖 GraphiQL @ ${url}graphiql 🤖🤖🤖`
  );
});

export { handlers } from './worker/handlers';
