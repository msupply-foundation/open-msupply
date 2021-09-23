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
import { TestQueries, TestQueryResolvers, TestTypes } from './schema/Test';

const typeDefs = gql`
  ${ItemType}
  ${TransactionTypes}
  ${TestTypes}

  ${TransactionInput}

  type Query {
    ${ItemQueries}
    ${TransactionQueries}
    ${TestQueries}
  }

  type Mutation {
    ${TransactionMutations}
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
  },
};

const server = new ApolloServer({ typeDefs, resolvers });

server.listen().then(({ url }) => {
  console.log(
    `🚀🚀🚀 Server   @ ${url}         🚀🚀🚀\n🤖🤖🤖 GraphiQL @ ${url}graphiql 🤖🤖🤖`
  );
});

// export {
//   TestQueryResolvers,
//   TestQueries,
//   TestTypes,
