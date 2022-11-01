import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/dist/types.dom';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type MasterListItemFragment = { __typename: 'ItemNode', id: string, code: string, name: string, unitName?: string | null };

export type MasterListLineFragment = { __typename: 'MasterListLineNode', id: string, item: { __typename: 'ItemNode', id: string, code: string, name: string, unitName?: string | null } };

export type MasterListFragment = { __typename: 'MasterListNode', name: string, code: string, description: string, id: string, lines: { __typename: 'MasterListLineConnector', nodes: Array<{ __typename: 'MasterListLineNode', id: string, item: { __typename: 'ItemNode', id: string, code: string, name: string, unitName?: string | null } }> } };

export type MasterListRowFragment = { __typename: 'MasterListNode', name: string, code: string, description: string, id: string };

export type MasterListsQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']>;
  key: Types.MasterListSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']>;
  filter?: Types.InputMaybe<Types.MasterListFilterInput>;
  storeId: Types.Scalars['String'];
}>;


export type MasterListsQuery = { __typename: 'Queries', masterLists: { __typename: 'MasterListConnector', totalCount: number, nodes: Array<{ __typename: 'MasterListNode', name: string, code: string, description: string, id: string }> } };

export type MasterListQueryVariables = Types.Exact<{
  filter?: Types.InputMaybe<Types.MasterListFilterInput>;
  storeId: Types.Scalars['String'];
}>;


export type MasterListQuery = { __typename: 'Queries', masterLists: { __typename: 'MasterListConnector', totalCount: number, nodes: Array<{ __typename: 'MasterListNode', name: string, code: string, description: string, id: string, lines: { __typename: 'MasterListLineConnector', nodes: Array<{ __typename: 'MasterListLineNode', id: string, item: { __typename: 'ItemNode', id: string, code: string, name: string, unitName?: string | null } }> } }> } };

export const MasterListItemFragmentDoc = gql`
    fragment MasterListItem on ItemNode {
  __typename
  id
  code
  name
  unitName
}
    `;
export const MasterListLineFragmentDoc = gql`
    fragment MasterListLine on MasterListLineNode {
  __typename
  id
  item {
    ...MasterListItem
  }
}
    ${MasterListItemFragmentDoc}`;
export const MasterListFragmentDoc = gql`
    fragment MasterList on MasterListNode {
  __typename
  name
  code
  description
  id
  lines {
    nodes {
      ...MasterListLine
    }
  }
}
    ${MasterListLineFragmentDoc}`;
export const MasterListRowFragmentDoc = gql`
    fragment MasterListRow on MasterListNode {
  __typename
  name
  code
  description
  id
}
    `;
export const MasterListsDocument = gql`
    query masterLists($first: Int, $offset: Int, $key: MasterListSortFieldInput!, $desc: Boolean, $filter: MasterListFilterInput, $storeId: String!) {
  masterLists(
    filter: $filter
    page: {first: $first, offset: $offset}
    sort: {key: $key, desc: $desc}
    storeId: $storeId
  ) {
    ... on MasterListConnector {
      __typename
      totalCount
      nodes {
        ...MasterListRow
      }
    }
  }
}
    ${MasterListRowFragmentDoc}`;
export const MasterListDocument = gql`
    query masterList($filter: MasterListFilterInput, $storeId: String!) {
  masterLists(filter: $filter, storeId: $storeId) {
    ... on MasterListConnector {
      __typename
      totalCount
      nodes {
        ...MasterList
      }
    }
  }
}
    ${MasterListFragmentDoc}`;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    masterLists(variables: MasterListsQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<MasterListsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<MasterListsQuery>(MasterListsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'masterLists', 'query');
    },
    masterList(variables: MasterListQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<MasterListQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<MasterListQuery>(MasterListDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'masterList', 'query');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockMasterListsQuery((req, res, ctx) => {
 *   const { first, offset, key, desc, filter, storeId } = req.variables;
 *   return res(
 *     ctx.data({ masterLists })
 *   )
 * })
 */
export const mockMasterListsQuery = (resolver: ResponseResolver<GraphQLRequest<MasterListsQueryVariables>, GraphQLContext<MasterListsQuery>, any>) =>
  graphql.query<MasterListsQuery, MasterListsQueryVariables>(
    'masterLists',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockMasterListQuery((req, res, ctx) => {
 *   const { filter, storeId } = req.variables;
 *   return res(
 *     ctx.data({ masterLists })
 *   )
 * })
 */
export const mockMasterListQuery = (resolver: ResponseResolver<GraphQLRequest<MasterListQueryVariables>, GraphQLContext<MasterListQuery>, any>) =>
  graphql.query<MasterListQuery, MasterListQueryVariables>(
    'masterList',
    resolver
  )
