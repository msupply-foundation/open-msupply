import { ApolloServer, gql } from 'apollo-server';
import {
  ItemQueries,
  ItemType,
  ItemResolvers,
  ItemMutationResolvers,
  ItemMutations,
  ItemInput,
} from './schema/Item';
import {
  TransactionMutations,
  TransactionQueries,
  TransactionQueryResolvers,
  TransactionMutationResolvers,
  TransactionTypes,
  TransactionInput,
} from './schema/Transaction';
import { TestQueries, TestQueryResolvers, TestTypes } from './schema/Test';

const typeDefs = gql`
  ${ItemType}
  ${TransactionTypes}
  ${TestTypes}

  ${TransactionInput}
  ${ItemInput}

  type Query {
    ${ItemQueries}
    ${TransactionQueries}
    ${TestQueries}
  }

  type Mutation {
    ${TransactionMutations}
    ${ItemMutations}
  }
`;

const resolvers = {
  Query: {
    ...TestQueryResolvers,
    ...ItemResolvers,
    ...TransactionQueryResolvers,
  },
  Mutation: {
    ...TransactionMutationResolvers,
    ...ItemMutationResolvers,
  },
};

const server = new ApolloServer({ typeDefs, resolvers });

server.listen().then(({ url }) => {
  console.log(
    `🚀🚀🚀 Server   @ ${url}         🚀🚀🚀\n🤖🤖🤖 GraphiQL @ ${url}graphiql 🤖🤖🤖`
  );
});
