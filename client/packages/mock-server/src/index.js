import { ApolloServer, gql } from 'apollo-server';
import { ItemQueries, ItemType, ItemResolvers } from './schema/Item';
import {
  InvoiceMutations,
  InvoiceQueries,
  InvoiceQueryResolvers,
  InvoicesMutationResolvers,
  InvoiceType,
  InvoiceInput,
} from './schema/Invoices';

const typeDefs = gql`
  ${ItemType}
  ${InvoiceType}

  ${InvoiceInput}

  type Query {
    ${ItemQueries}
    ${InvoiceQueries}
  }

  type Mutation {
    ${InvoiceMutations}
  }
`;

const resolvers = {
  Query: {
    ...ItemResolvers,
    ...InvoiceQueryResolvers,
  },
  Mutation: {
    ...InvoicesMutationResolvers,
  },
};

const server = new ApolloServer({ typeDefs, resolvers });

server.listen().then(({ url }) => {
  console.log(
    `🚀🚀🚀 Server   @ ${url}         🚀🚀🚀\n🤖🤖🤖 GraphiQL @ ${url}graphiql 🤖🤖🤖`
  );
});
