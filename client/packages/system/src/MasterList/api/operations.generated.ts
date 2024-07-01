import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import { GraphQLClientRequestHeaders } from 'graphql-request/build/cjs/types';
import gql from 'graphql-tag';
export type MasterListItemFragment = { __typename: 'ItemNode', id: string, code: string, name: string, unitName?: string | null };

export type MasterListLineFragment = { __typename: 'MasterListLineNode', id: string, item: { __typename: 'ItemNode', id: string, code: string, name: string, unitName?: string | null } };

export type MasterListRowFragment = { __typename: 'MasterListNode', name: string, code: string, description: string, id: string, linesCount?: number | null };

export type MasterListsQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  key: Types.MasterListSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']['input']>;
  filter?: Types.InputMaybe<Types.MasterListFilterInput>;
  storeId: Types.Scalars['String']['input'];
}>;


export type MasterListsQuery = { __typename: 'Queries', masterLists: { __typename: 'MasterListConnector', totalCount: number, nodes: Array<{ __typename: 'MasterListNode', name: string, code: string, description: string, id: string, linesCount?: number | null }> } };

export type MasterListsByItemIdQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  itemId: Types.Scalars['String']['input'];
}>;


export type MasterListsByItemIdQuery = { __typename: 'Queries', masterLists: { __typename: 'MasterListConnector', totalCount: number, nodes: Array<{ __typename: 'MasterListNode', name: string, code: string, description: string, id: string, linesCount?: number | null }> } };

export type MasterListQueryVariables = Types.Exact<{
  filter?: Types.InputMaybe<Types.MasterListFilterInput>;
  storeId: Types.Scalars['String']['input'];
}>;


export type MasterListQuery = { __typename: 'Queries', masterLists: { __typename: 'MasterListConnector', totalCount: number, nodes: Array<{ __typename: 'MasterListNode', name: string, code: string, description: string, id: string, linesCount?: number | null }> } };

export type MasterListLinesQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  masterListId: Types.Scalars['String']['input'];
  page?: Types.InputMaybe<Types.PaginationInput>;
  sort?: Types.InputMaybe<Array<Types.MasterListLineSortInput> | Types.MasterListLineSortInput>;
  filter?: Types.InputMaybe<Types.MasterListLineFilterInput>;
}>;


export type MasterListLinesQuery = { __typename: 'Queries', masterListLines: { __typename: 'MasterListLineConnector', totalCount: number, nodes: Array<{ __typename: 'MasterListLineNode', id: string, item: { __typename: 'ItemNode', id: string, code: string, name: string, unitName?: string | null } }> } };

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
export const MasterListRowFragmentDoc = gql`
    fragment MasterListRow on MasterListNode {
  __typename
  name
  code
  description
  id
  linesCount
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
export const MasterListsByItemIdDocument = gql`
    query masterListsByItemId($storeId: String!, $itemId: String!) {
  masterLists(
    filter: {itemId: {equalTo: $itemId}, existsForStoreId: {equalTo: $storeId}}
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
        ...MasterListRow
      }
    }
  }
}
    ${MasterListRowFragmentDoc}`;
export const MasterListLinesDocument = gql`
    query masterListLines($storeId: String!, $masterListId: String!, $page: PaginationInput, $sort: [MasterListLineSortInput!], $filter: MasterListLineFilterInput) {
  masterListLines(
    storeId: $storeId
    masterListId: $masterListId
    page: $page
    sort: $sort
    filter: $filter
  ) {
    ... on MasterListLineConnector {
      __typename
      totalCount
      nodes {
        ...MasterListLine
      }
    }
  }
}
    ${MasterListLineFragmentDoc}`;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    masterLists(variables: MasterListsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<MasterListsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<MasterListsQuery>(MasterListsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'masterLists', 'query');
    },
    masterListsByItemId(variables: MasterListsByItemIdQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<MasterListsByItemIdQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<MasterListsByItemIdQuery>(MasterListsByItemIdDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'masterListsByItemId', 'query');
    },
    masterList(variables: MasterListQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<MasterListQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<MasterListQuery>(MasterListDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'masterList', 'query');
    },
    masterListLines(variables: MasterListLinesQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<MasterListLinesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<MasterListLinesQuery>(MasterListLinesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'masterListLines', 'query');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;