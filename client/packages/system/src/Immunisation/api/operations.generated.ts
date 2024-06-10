import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import { GraphQLClientRequestHeaders } from 'graphql-request/build/cjs/types';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type ImmunisationProgramFragment = { __typename: 'ProgramNode', id: string, name: string };

export type ProgramsQueryVariables = Types.Exact<{
  storeId?: Types.InputMaybe<Types.Scalars['String']['input']>;
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  key: Types.ProgramSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.ProgramFilterInput>;
}>;


export type ProgramsQuery = { __typename: 'Queries', programs: { __typename: 'ProgramConnector', totalCount: number, nodes: Array<{ __typename: 'ProgramNode', id: string, name: string }> } };

export type InsertImmunisationProgramMutationVariables = Types.Exact<{
  input?: Types.InputMaybe<Types.InsertImmunisationProgramInput>;
  storeId?: Types.InputMaybe<Types.Scalars['String']['input']>;
}>;


export type InsertImmunisationProgramMutation = { __typename: 'Mutations', centralServer: { __typename: 'CentralServerMutationNode', program: { __typename: 'CentralProgramsMutations', insertImmunisationProgram: { __typename: 'InsertImmunisationProgramError', error: { __typename: 'DatabaseError', description: string } | { __typename: 'RecordAlreadyExist', description: string } } | { __typename: 'ProgramNode', id: string, name: string } } } };

export type UpdateImmunisationProgramMutationVariables = Types.Exact<{
  input?: Types.InputMaybe<Types.UpdateImmunisationProgramInput>;
  storeId?: Types.InputMaybe<Types.Scalars['String']['input']>;
}>;


export type UpdateImmunisationProgramMutation = { __typename: 'Mutations', centralServer: { __typename: 'CentralServerMutationNode', program: { __typename: 'CentralProgramsMutations', updateImmunisationProgram: { __typename: 'ProgramNode', id: string, name: string } | { __typename: 'UpdateImmunisationProgramError', error: { __typename: 'DatabaseError', description: string } | { __typename: 'RecordAlreadyExist', description: string } | { __typename: 'UniqueValueViolation', field: Types.UniqueValueKey, description: string } } } } };

export const ImmunisationProgramFragmentDoc = gql`
    fragment ImmunisationProgram on ProgramNode {
  id
  name
}
    `;
export const ProgramsDocument = gql`
    query programs($storeId: String, $first: Int, $offset: Int, $key: ProgramSortFieldInput!, $desc: Boolean, $filter: ProgramFilterInput) {
  programs(
    storeId: $storeId
    page: {first: $first, offset: $offset}
    sort: {key: $key, desc: $desc}
    filter: $filter
  ) {
    ... on ProgramConnector {
      __typename
      nodes {
        __typename
        ...ImmunisationProgram
      }
      totalCount
    }
  }
}
    ${ImmunisationProgramFragmentDoc}`;
export const InsertImmunisationProgramDocument = gql`
    mutation insertImmunisationProgram($input: InsertImmunisationProgramInput, $storeId: String) {
  centralServer {
    program {
      insertImmunisationProgram(input: $input, storeId: $storeId) {
        ... on ProgramNode {
          ...ImmunisationProgram
        }
        ... on InsertImmunisationProgramError {
          __typename
          error {
            description
          }
        }
      }
    }
  }
}
    ${ImmunisationProgramFragmentDoc}`;
export const UpdateImmunisationProgramDocument = gql`
    mutation updateImmunisationProgram($input: UpdateImmunisationProgramInput, $storeId: String) {
  centralServer {
    program {
      updateImmunisationProgram(input: $input, storeId: $storeId) {
        __typename
        ... on ProgramNode {
          ...ImmunisationProgram
        }
        ... on UpdateImmunisationProgramError {
          __typename
          error {
            ... on UniqueValueViolation {
              __typename
              field
            }
            description
          }
        }
      }
    }
  }
}
    ${ImmunisationProgramFragmentDoc}`;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    programs(variables: ProgramsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<ProgramsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ProgramsQuery>(ProgramsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'programs', 'query');
    },
    insertImmunisationProgram(variables?: InsertImmunisationProgramMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsertImmunisationProgramMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertImmunisationProgramMutation>(InsertImmunisationProgramDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertImmunisationProgram', 'mutation');
    },
    updateImmunisationProgram(variables?: UpdateImmunisationProgramMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateImmunisationProgramMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateImmunisationProgramMutation>(UpdateImmunisationProgramDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateImmunisationProgram', 'mutation');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockProgramsQuery((req, res, ctx) => {
 *   const { storeId, first, offset, key, desc, filter } = req.variables;
 *   return res(
 *     ctx.data({ programs })
 *   )
 * })
 */
export const mockProgramsQuery = (resolver: ResponseResolver<GraphQLRequest<ProgramsQueryVariables>, GraphQLContext<ProgramsQuery>, any>) =>
  graphql.query<ProgramsQuery, ProgramsQueryVariables>(
    'programs',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInsertImmunisationProgramMutation((req, res, ctx) => {
 *   const { input, storeId } = req.variables;
 *   return res(
 *     ctx.data({ centralServer })
 *   )
 * })
 */
export const mockInsertImmunisationProgramMutation = (resolver: ResponseResolver<GraphQLRequest<InsertImmunisationProgramMutationVariables>, GraphQLContext<InsertImmunisationProgramMutation>, any>) =>
  graphql.mutation<InsertImmunisationProgramMutation, InsertImmunisationProgramMutationVariables>(
    'insertImmunisationProgram',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockUpdateImmunisationProgramMutation((req, res, ctx) => {
 *   const { input, storeId } = req.variables;
 *   return res(
 *     ctx.data({ centralServer })
 *   )
 * })
 */
export const mockUpdateImmunisationProgramMutation = (resolver: ResponseResolver<GraphQLRequest<UpdateImmunisationProgramMutationVariables>, GraphQLContext<UpdateImmunisationProgramMutation>, any>) =>
  graphql.mutation<UpdateImmunisationProgramMutation, UpdateImmunisationProgramMutationVariables>(
    'updateImmunisationProgram',
    resolver
  )
