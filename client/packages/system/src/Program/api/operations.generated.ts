import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/dist/types.dom';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type ProgramDocumentFragment = { __typename: 'DocumentRegistryNode', formSchemaId: string, jsonSchema: any, id: string, name?: string | null };

export type ProgramsQueryVariables = Types.Exact<{
  key: Types.DocumentRegistrySortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']>;
}>;


export type ProgramsQuery = { __typename: 'FullQuery', documentRegistries: { __typename: 'DocumentRegistryConnector', totalCount: number, nodes: Array<{ __typename: 'DocumentRegistryNode', formSchemaId: string, jsonSchema: any, id: string, name?: string | null }> } };

export const ProgramDocumentFragmentDoc = gql`
    fragment ProgramDocument on DocumentRegistryNode {
  formSchemaId
  jsonSchema
  id
  name
}
    `;
export const ProgramsDocument = gql`
    query programs($key: DocumentRegistrySortFieldInput!, $desc: Boolean) {
  documentRegistries(
    sort: {key: $key, desc: $desc}
    filter: {context: {equalTo: PROGRAM}}
  ) {
    ... on DocumentRegistryConnector {
      __typename
      totalCount
      nodes {
        __typename
        ...ProgramDocument
      }
    }
  }
}
    ${ProgramDocumentFragmentDoc}`;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    programs(variables: ProgramsQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<ProgramsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ProgramsQuery>(ProgramsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'programs', 'query');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockProgramsQuery((req, res, ctx) => {
 *   const { key, desc } = req.variables;
 *   return res(
 *     ctx.data({ documentRegistries })
 *   )
 * })
 */
export const mockProgramsQuery = (resolver: ResponseResolver<GraphQLRequest<ProgramsQueryVariables>, GraphQLContext<ProgramsQuery>, any>) =>
  graphql.query<ProgramsQuery, ProgramsQueryVariables>(
    'programs',
    resolver
  )
