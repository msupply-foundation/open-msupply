import * as Types from '@openmsupply-client/common';

import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
export type LocationRowFragment = { __typename: 'LocationNode', id: string, name: string, onHold: boolean, code: string };

export type LocationsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  sort?: Types.InputMaybe<Array<Types.LocationSortInput> | Types.LocationSortInput>;
  first?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']['input']>;
  filter?: Types.InputMaybe<Types.LocationFilterInput>;
}>;


export type LocationsQuery = { __typename: 'Queries', locations: { __typename: 'LocationConnector', totalCount: number, nodes: Array<{ __typename: 'LocationNode', id: string, name: string, onHold: boolean, code: string }> } };

export type InsertLocationMutationVariables = Types.Exact<{
  input: Types.InsertLocationInput;
  storeId: Types.Scalars['String']['input'];
}>;


export type InsertLocationMutation = { __typename: 'Mutations', insertLocation: { __typename: 'InsertLocationError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'InternalError', description: string, fullError: string } | { __typename: 'RecordAlreadyExist', description: string } | { __typename: 'UniqueValueViolation', description: string, field: Types.UniqueValueKey } } | { __typename: 'LocationNode', id: string, name: string, onHold: boolean, code: string } };

export type UpdateLocationMutationVariables = Types.Exact<{
  input: Types.UpdateLocationInput;
  storeId: Types.Scalars['String']['input'];
}>;


export type UpdateLocationMutation = { __typename: 'Mutations', updateLocation: { __typename: 'LocationNode', id: string, name: string, onHold: boolean, code: string } | { __typename: 'UpdateLocationError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'InternalError', description: string, fullError: string } | { __typename: 'RecordBelongsToAnotherStore', description: string } | { __typename: 'RecordNotFound', description: string } | { __typename: 'UniqueValueViolation', description: string, field: Types.UniqueValueKey } } };

export type DeleteLocationMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.DeleteLocationInput;
}>;


export type DeleteLocationMutation = { __typename: 'Mutations', deleteLocation: { __typename: 'DeleteLocationError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'LocationInUse', description: string, stockLines: { __typename: 'StockLineConnector', totalCount: number, nodes: Array<{ __typename: 'StockLineNode', id: string, itemId: string }> }, invoiceLines: { __typename: 'InvoiceLineConnector', totalCount: number, nodes: Array<{ __typename: 'InvoiceLineNode', id: string }> } } | { __typename: 'RecordBelongsToAnotherStore', description: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'DeleteResponse', id: string } };

export const LocationRowFragmentDoc = gql`
    fragment LocationRow on LocationNode {
  __typename
  id
  name
  onHold
  code
}
    `;
export const LocationsDocument = gql`
    query locations($storeId: String!, $sort: [LocationSortInput!], $first: Int, $offset: Int, $filter: LocationFilterInput) {
  locations(
    storeId: $storeId
    sort: $sort
    page: {first: $first, offset: $offset}
    filter: $filter
  ) {
    __typename
    ... on LocationConnector {
      __typename
      totalCount
      nodes {
        __typename
        id
        name
        onHold
        code
      }
    }
  }
}
    `;
export const InsertLocationDocument = gql`
    mutation insertLocation($input: InsertLocationInput!, $storeId: String!) {
  insertLocation(input: $input, storeId: $storeId) {
    ... on InsertLocationError {
      __typename
      error {
        description
        ... on InternalError {
          __typename
          description
          fullError
        }
        ... on DatabaseError {
          __typename
          description
          fullError
        }
        ... on RecordAlreadyExist {
          __typename
          description
        }
        ... on UniqueValueViolation {
          __typename
          description
          field
        }
      }
    }
    ...LocationRow
  }
}
    ${LocationRowFragmentDoc}`;
export const UpdateLocationDocument = gql`
    mutation updateLocation($input: UpdateLocationInput!, $storeId: String!) {
  updateLocation(input: $input, storeId: $storeId) {
    ... on UpdateLocationError {
      __typename
      error {
        description
        ... on InternalError {
          __typename
          description
          fullError
        }
        ... on DatabaseError {
          __typename
          description
          fullError
        }
        ... on RecordBelongsToAnotherStore {
          __typename
          description
        }
        ... on RecordNotFound {
          __typename
          description
        }
        ... on UniqueValueViolation {
          __typename
          description
          field
        }
      }
    }
    ...LocationRow
  }
}
    ${LocationRowFragmentDoc}`;
export const DeleteLocationDocument = gql`
    mutation deleteLocation($storeId: String!, $input: DeleteLocationInput!) {
  deleteLocation(storeId: $storeId, input: $input) {
    ... on DeleteLocationError {
      __typename
      error {
        description
        ... on RecordNotFound {
          __typename
          description
        }
        ... on DatabaseError {
          __typename
          description
          fullError
        }
        ... on RecordBelongsToAnotherStore {
          __typename
          description
        }
        ... on LocationInUse {
          __typename
          description
          stockLines {
            ... on StockLineConnector {
              __typename
              nodes {
                __typename
                id
                itemId
              }
              totalCount
            }
          }
          invoiceLines {
            ... on InvoiceLineConnector {
              __typename
              nodes {
                __typename
                id
              }
            }
            totalCount
          }
        }
      }
    }
    ... on DeleteResponse {
      __typename
      id
    }
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    locations(variables: LocationsQueryVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<LocationsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<LocationsQuery>(LocationsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'locations', 'query', variables);
    },
    insertLocation(variables: InsertLocationMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<InsertLocationMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertLocationMutation>(InsertLocationDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertLocation', 'mutation', variables);
    },
    updateLocation(variables: UpdateLocationMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<UpdateLocationMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateLocationMutation>(UpdateLocationDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateLocation', 'mutation', variables);
    },
    deleteLocation(variables: DeleteLocationMutationVariables, requestHeaders?: GraphQLClientRequestHeaders): Promise<DeleteLocationMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeleteLocationMutation>(DeleteLocationDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'deleteLocation', 'mutation', variables);
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;