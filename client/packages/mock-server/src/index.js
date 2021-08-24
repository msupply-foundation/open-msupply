import { ApolloServer, gql } from 'apollo-server';
import { ItemQueries, ItemType, ItemResolvers } from './schema/Item';
import {
  TransactionMutations,
  TransactionQueries,
  TransactionQueryResolvers,
  TransactionMutationResolvers,
  TransactionTypes,
  TransactionInput,
} from './schema/Transaction';

const typeDefs = gql`
  ${ItemType}
  ${TransactionTypes}

  ${TransactionInput}

  type Query {
    ${ItemQueries}
    ${TransactionQueries}
  }

  type Mutation {
    ${TransactionMutations}
  }
`;

const resolvers = {
  Query: {
    ...ItemResolvers,
    ...TransactionQueryResolvers,
  },
  Mutation: {
    ...TransactionMutationResolvers,
  },
};

const server = new ApolloServer({ typeDefs, resolvers });

server.listen().then(({ url }) => {
  console.log(
    `🚀🚀🚀 Server   @ ${url}         🚀🚀🚀\n🤖🤖🤖 GraphiQL @ ${url}graphiql 🤖🤖🤖`
  );
});
