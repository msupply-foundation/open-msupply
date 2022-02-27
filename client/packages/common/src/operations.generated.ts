import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/dist/types.dom';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type LocationsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  sort?: Types.InputMaybe<Array<Types.LocationSortInput> | Types.LocationSortInput>;
}>;


export type LocationsQuery = { __typename: 'Queries', locations: { __typename: 'LocationConnector', totalCount: number, nodes: Array<{ __typename: 'LocationNode', id: string, name: string, onHold: boolean, code: string }> } };

export type InsertLocationMutationVariables = Types.Exact<{
  input: Types.InsertLocationInput;
  storeId: Types.Scalars['String'];
}>;


export type InsertLocationMutation = { __typename: 'Mutations', insertLocation: { __typename: 'InsertLocationError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'InternalError', description: string, fullError: string } | { __typename: 'RecordAlreadyExist', description: string } | { __typename: 'UniqueValueViolation', description: string, field: Types.UniqueValueKey } } | { __typename: 'LocationNode', id: string, name: string, code: string, onHold: boolean } };

export type UpdateLocationMutationVariables = Types.Exact<{
  input: Types.UpdateLocationInput;
  storeId: Types.Scalars['String'];
}>;


export type UpdateLocationMutation = { __typename: 'Mutations', updateLocation: { __typename: 'LocationNode', id: string, name: string, onHold: boolean, code: string } | { __typename: 'UpdateLocationError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'InternalError', description: string, fullError: string } | { __typename: 'RecordBelongsToAnotherStore', description: string } | { __typename: 'RecordNotFound', description: string } | { __typename: 'UniqueValueViolation', description: string, field: Types.UniqueValueKey } } };

export type DeleteLocationMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  input: Types.DeleteLocationInput;
}>;


export type DeleteLocationMutation = { __typename: 'Mutations', deleteLocation: { __typename: 'DeleteLocationError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'LocationInUse', description: string, stockLines: { __typename: 'StockLineConnector', totalCount: number, nodes: Array<{ __typename: 'StockLineNode', id: string, itemId: string }> }, invoiceLines: { __typename: 'InvoiceLineConnector', totalCount: number, nodes: Array<{ __typename: 'InvoiceLineNode', id: string }> } } | { __typename: 'RecordBelongsToAnotherStore', description: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'DeleteResponse', id: string } };

export type StoresQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']>;
  filter?: Types.InputMaybe<Types.StoreFilterInput>;
}>;


export type StoresQuery = { __typename: 'Queries', stores: { __typename: 'StoreConnector', totalCount: number, nodes: Array<{ __typename: 'StoreNode', code: string, id: string }> } };

export type AuthTokenQueryVariables = Types.Exact<{
  username: Types.Scalars['String'];
  password: Types.Scalars['String'];
}>;


export type AuthTokenQuery = { __typename: 'Queries', authToken: { __typename: 'AuthToken', token: string } | { __typename: 'AuthTokenError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'InternalError', description: string, fullError: string } | { __typename: 'InvalidCredentials', description: string } | { __typename: 'UserNameDoesNotExist', description: string } } };

export type MasterListsQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']>;
  key: Types.MasterListSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']>;
  filter?: Types.InputMaybe<Types.MasterListFilterInput>;
  storeId: Types.Scalars['String'];
}>;


export type MasterListsQuery = { __typename: 'Queries', masterLists: { __typename: 'MasterListConnector', totalCount: number, nodes: Array<{ __typename: 'MasterListNode', name: string, code: string, description: string, id: string, lines: { __typename: 'MasterListLineConnector', totalCount: number, nodes: Array<{ __typename: 'MasterListLineNode', id: string, itemId: string, item: { __typename: 'ItemNode', code: string, id: string, unitName?: string | null, name: string, isVisible: boolean, availableBatches: { __typename: 'StockLineConnector', totalCount: number, nodes: Array<{ __typename: 'StockLineNode', availableNumberOfPacks: number, batch?: string | null, costPricePerPack: number, expiryDate?: string | null, itemId: string, id: string, totalNumberOfPacks: number, storeId: string, sellPricePerPack: number, packSize: number, onHold: boolean, note?: string | null, locationName?: string | null }> } } }> } }> } };


export const LocationsDocument = gql`
    query locations($storeId: String!, $sort: [LocationSortInput!]) {
  locations(storeId: $storeId, sort: $sort) {
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
    ... on LocationNode {
      id
      name
      code
      onHold
    }
  }
}
    `;
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
    ... on LocationNode {
      id
      name
      onHold
      code
    }
  }
}
    `;
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
export const StoresDocument = gql`
    query stores($first: Int, $offset: Int, $filter: StoreFilterInput) {
  stores(page: {first: $first, offset: $offset}, filter: $filter) {
    ... on StoreConnector {
      __typename
      totalCount
      nodes {
        code
        id
      }
    }
  }
}
    `;
export const AuthTokenDocument = gql`
    query authToken($username: String!, $password: String!) {
  authToken(password: $password, username: $username) {
    ... on AuthToken {
      __typename
      token
    }
    ... on AuthTokenError {
      __typename
      error {
        ... on UserNameDoesNotExist {
          __typename
          description
        }
        ... on InvalidCredentials {
          __typename
          description
        }
        ... on DatabaseError {
          __typename
          description
          fullError
        }
        ... on InternalError {
          __typename
          description
          fullError
        }
        description
      }
    }
  }
}
    `;
export const MasterListsDocument = gql`
    query masterLists($first: Int, $offset: Int, $key: MasterListSortFieldInput!, $desc: Boolean, $filter: MasterListFilterInput, $storeId: String!) {
  masterLists(
    filter: $filter
    page: {first: $first, offset: $offset}
    sort: {key: $key, desc: $desc}
  ) {
    ... on MasterListConnector {
      __typename
      totalCount
      nodes {
        name
        code
        description
        id
        lines {
          __typename
          totalCount
          nodes {
            id
            itemId
            item {
              code
              id
              unitName
              name
              isVisible
              availableBatches(storeId: $storeId) {
                __typename
                totalCount
                nodes {
                  __typename
                  availableNumberOfPacks
                  batch
                  costPricePerPack
                  expiryDate
                  itemId
                  id
                  totalNumberOfPacks
                  storeId
                  sellPricePerPack
                  packSize
                  onHold
                  note
                  locationName
                }
              }
            }
          }
        }
      }
    }
  }
}
    `;

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    locations(variables: LocationsQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<LocationsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<LocationsQuery>(LocationsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'locations');
    },
    insertLocation(variables: InsertLocationMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<InsertLocationMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertLocationMutation>(InsertLocationDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertLocation');
    },
    updateLocation(variables: UpdateLocationMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<UpdateLocationMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateLocationMutation>(UpdateLocationDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateLocation');
    },
    deleteLocation(variables: DeleteLocationMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<DeleteLocationMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeleteLocationMutation>(DeleteLocationDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'deleteLocation');
    },
    stores(variables?: StoresQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<StoresQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<StoresQuery>(StoresDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'stores');
    },
    authToken(variables: AuthTokenQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<AuthTokenQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<AuthTokenQuery>(AuthTokenDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'authToken');
    },
    masterLists(variables: MasterListsQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<MasterListsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<MasterListsQuery>(MasterListsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'masterLists');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockLocationsQuery((req, res, ctx) => {
 *   const { storeId, sort } = req.variables;
 *   return res(
 *     ctx.data({ locations })
 *   )
 * })
 */
export const mockLocationsQuery = (resolver: ResponseResolver<GraphQLRequest<LocationsQueryVariables>, GraphQLContext<LocationsQuery>, any>) =>
  graphql.query<LocationsQuery, LocationsQueryVariables>(
    'locations',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInsertLocationMutation((req, res, ctx) => {
 *   const { input, storeId } = req.variables;
 *   return res(
 *     ctx.data({ insertLocation })
 *   )
 * })
 */
export const mockInsertLocationMutation = (resolver: ResponseResolver<GraphQLRequest<InsertLocationMutationVariables>, GraphQLContext<InsertLocationMutation>, any>) =>
  graphql.mutation<InsertLocationMutation, InsertLocationMutationVariables>(
    'insertLocation',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockUpdateLocationMutation((req, res, ctx) => {
 *   const { input, storeId } = req.variables;
 *   return res(
 *     ctx.data({ updateLocation })
 *   )
 * })
 */
export const mockUpdateLocationMutation = (resolver: ResponseResolver<GraphQLRequest<UpdateLocationMutationVariables>, GraphQLContext<UpdateLocationMutation>, any>) =>
  graphql.mutation<UpdateLocationMutation, UpdateLocationMutationVariables>(
    'updateLocation',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockDeleteLocationMutation((req, res, ctx) => {
 *   const { storeId, input } = req.variables;
 *   return res(
 *     ctx.data({ deleteLocation })
 *   )
 * })
 */
export const mockDeleteLocationMutation = (resolver: ResponseResolver<GraphQLRequest<DeleteLocationMutationVariables>, GraphQLContext<DeleteLocationMutation>, any>) =>
  graphql.mutation<DeleteLocationMutation, DeleteLocationMutationVariables>(
    'deleteLocation',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockStoresQuery((req, res, ctx) => {
 *   const { first, offset, filter } = req.variables;
 *   return res(
 *     ctx.data({ stores })
 *   )
 * })
 */
export const mockStoresQuery = (resolver: ResponseResolver<GraphQLRequest<StoresQueryVariables>, GraphQLContext<StoresQuery>, any>) =>
  graphql.query<StoresQuery, StoresQueryVariables>(
    'stores',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockAuthTokenQuery((req, res, ctx) => {
 *   const { username, password } = req.variables;
 *   return res(
 *     ctx.data({ authToken })
 *   )
 * })
 */
export const mockAuthTokenQuery = (resolver: ResponseResolver<GraphQLRequest<AuthTokenQueryVariables>, GraphQLContext<AuthTokenQuery>, any>) =>
  graphql.query<AuthTokenQuery, AuthTokenQueryVariables>(
    'authToken',
    resolver
  )

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
