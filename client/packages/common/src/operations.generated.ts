import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/dist/types.dom';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type NamesQueryVariables = Types.Exact<{
  key: Types.NameSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']>;
  first?: Types.InputMaybe<Types.Scalars['Int']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']>;
  filter?: Types.InputMaybe<Types.NameFilterInput>;
}>;


export type NamesQuery = { __typename: 'Queries', names: { __typename: 'ConnectorError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'PaginationError', description: string, rangeError: { __typename: 'RangeError', description: string, field: Types.RangeField, max?: number | null, min?: number | null } } } | { __typename: 'NameConnector', totalCount: number, nodes: Array<{ __typename: 'NameNode', code: string, id: string, isCustomer: boolean, isSupplier: boolean, name: string, store?: { __typename: 'StoreNode', id: string, code: string } | null }> } };

export type ItemsWithStockLinesQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']>;
  key: Types.ItemSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']>;
  filter?: Types.InputMaybe<Types.ItemFilterInput>;
  storeId: Types.Scalars['String'];
}>;


export type ItemsWithStockLinesQuery = { __typename: 'Queries', items: { __typename: 'ConnectorError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'PaginationError', description: string, rangeError: { __typename: 'RangeError', description: string, field: Types.RangeField, max?: number | null, min?: number | null } } } | { __typename: 'ItemConnector', totalCount: number, nodes: Array<{ __typename: 'ItemNode', code: string, id: string, isVisible: boolean, name: string, unitName?: string | null, availableBatches: { __typename: 'ConnectorError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'PaginationError', description: string, rangeError: { __typename: 'RangeError', description: string, field: Types.RangeField, max?: number | null, min?: number | null } } } | { __typename: 'StockLineConnector', totalCount: number, nodes: Array<{ __typename: 'StockLineNode', availableNumberOfPacks: number, batch?: string | null, costPricePerPack: number, expiryDate?: string | null, id: string, itemId: string, packSize: number, sellPricePerPack: number, totalNumberOfPacks: number, onHold: boolean, note?: string | null, storeId: string, locationName?: string | null }> } }> } };

export type ItemsListViewQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']>;
  key: Types.ItemSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']>;
  filter?: Types.InputMaybe<Types.ItemFilterInput>;
}>;


export type ItemsListViewQuery = { __typename: 'Queries', items: { __typename: 'ConnectorError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'PaginationError', description: string, rangeError: { __typename: 'RangeError', description: string, field: Types.RangeField, max?: number | null, min?: number | null } } } | { __typename: 'ItemConnector', totalCount: number, nodes: Array<{ __typename: 'ItemNode', code: string, id: string, isVisible: boolean, name: string, unitName?: string | null }> } };

export type StockCountsQueryVariables = Types.Exact<{
  daysTillExpired?: Types.InputMaybe<Types.Scalars['Int']>;
  timezoneOffset?: Types.InputMaybe<Types.Scalars['Int']>;
}>;


export type StockCountsQuery = { __typename: 'Queries', stockCounts: { __typename: 'StockCounts', expired: number, expiringSoon: number } };

export type LocationsQueryVariables = Types.Exact<{
  sort?: Types.InputMaybe<Array<Types.LocationSortInput> | Types.LocationSortInput>;
}>;


export type LocationsQuery = { __typename: 'Queries', locations: { __typename: 'ConnectorError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'PaginationError', description: string, rangeError: { __typename: 'RangeError', description: string, field: Types.RangeField, max?: number | null, min?: number | null } } } | { __typename: 'LocationConnector', totalCount: number, nodes: Array<{ __typename: 'LocationNode', id: string, name: string, onHold: boolean, code: string }> } };

export type InsertLocationMutationVariables = Types.Exact<{
  input: Types.InsertLocationInput;
}>;


export type InsertLocationMutation = { __typename: 'Mutations', insertLocation: { __typename: 'InsertLocationError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'InternalError', description: string, fullError: string } | { __typename: 'RecordAlreadyExist', description: string } | { __typename: 'UniqueValueViolation', description: string, field: Types.UniqueValueKey } } | { __typename: 'LocationNode', id: string, name: string, code: string, onHold: boolean } };

export type UpdateLocationMutationVariables = Types.Exact<{
  input: Types.UpdateLocationInput;
}>;


export type UpdateLocationMutation = { __typename: 'Mutations', updateLocation: { __typename: 'LocationNode', id: string, name: string, onHold: boolean, code: string } | { __typename: 'UpdateLocationError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'InternalError', description: string, fullError: string } | { __typename: 'RecordBelongsToAnotherStore', description: string } | { __typename: 'RecordNotFound', description: string } | { __typename: 'UniqueValueViolation', description: string, field: Types.UniqueValueKey } } };

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
}>;


export type MasterListsQuery = { __typename: 'Queries', masterLists: { __typename: 'ConnectorError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'PaginationError', description: string, rangeError: { __typename: 'RangeError', field: Types.RangeField, min?: number | null, max?: number | null, description: string } } } | { __typename: 'MasterListConnector', totalCount: number, nodes: Array<{ __typename: 'MasterListNode', name: string, code: string, description: string, id: string, lines: { __typename: 'MasterListLineConnector', totalCount: number, nodes: Array<{ __typename: 'MasterListLineNode', id: string, itemId: string, item: { __typename: 'ItemNode', code: string, id: string, unitName?: string | null, name: string, isVisible: boolean, availableBatches: { __typename: 'ConnectorError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'PaginationError', description: string, rangeError: { __typename: 'RangeError', description: string, min?: number | null, max?: number | null, field: Types.RangeField } } } | { __typename: 'StockLineConnector', totalCount: number, nodes: Array<{ __typename: 'StockLineNode', availableNumberOfPacks: number, batch?: string | null, costPricePerPack: number, expiryDate?: string | null, itemId: string, id: string, totalNumberOfPacks: number, storeId: string, sellPricePerPack: number, packSize: number, onHold: boolean, note?: string | null, locationName?: string | null }> } } }> } }> } };


export const NamesDocument = gql`
    query names($key: NameSortFieldInput!, $desc: Boolean, $first: Int, $offset: Int, $filter: NameFilterInput) {
  names(
    page: {first: $first, offset: $offset}
    sort: {key: $key, desc: $desc}
    filter: $filter
  ) {
    ... on ConnectorError {
      __typename
      error {
        ... on DatabaseError {
          __typename
          description
          fullError
        }
        description
        ... on PaginationError {
          __typename
          description
          rangeError {
            description
            field
            max
            min
          }
        }
      }
    }
    ... on NameConnector {
      __typename
      nodes {
        code
        id
        isCustomer
        isSupplier
        name
        store {
          id
          code
        }
      }
      totalCount
    }
  }
}
    `;
export const ItemsWithStockLinesDocument = gql`
    query itemsWithStockLines($first: Int, $offset: Int, $key: ItemSortFieldInput!, $desc: Boolean, $filter: ItemFilterInput, $storeId: String!) {
  items(
    page: {first: $first, offset: $offset}
    sort: {key: $key, desc: $desc}
    filter: $filter
  ) {
    ... on ConnectorError {
      __typename
      error {
        description
        ... on DatabaseError {
          __typename
          description
          fullError
        }
        ... on PaginationError {
          __typename
          description
          rangeError {
            description
            field
            max
            min
          }
        }
      }
    }
    ... on ItemConnector {
      __typename
      nodes {
        __typename
        availableBatches(storeId: $storeId) {
          __typename
          ... on ConnectorError {
            __typename
            error {
              description
              ... on DatabaseError {
                __typename
                description
                fullError
              }
              ... on PaginationError {
                __typename
                description
                rangeError {
                  description
                  field
                  max
                  min
                }
              }
            }
          }
          ... on StockLineConnector {
            __typename
            nodes {
              __typename
              availableNumberOfPacks
              batch
              costPricePerPack
              expiryDate
              id
              itemId
              packSize
              sellPricePerPack
              totalNumberOfPacks
              onHold
              note
              storeId
              locationName
            }
            totalCount
          }
        }
        code
        id
        isVisible
        name
        unitName
      }
      totalCount
    }
  }
}
    `;
export const ItemsListViewDocument = gql`
    query itemsListView($first: Int, $offset: Int, $key: ItemSortFieldInput!, $desc: Boolean, $filter: ItemFilterInput) {
  items(
    page: {first: $first, offset: $offset}
    sort: {key: $key, desc: $desc}
    filter: $filter
  ) {
    ... on ConnectorError {
      __typename
      error {
        description
        ... on DatabaseError {
          __typename
          description
          fullError
        }
        ... on PaginationError {
          __typename
          description
          rangeError {
            description
            field
            max
            min
          }
        }
      }
    }
    ... on ItemConnector {
      __typename
      nodes {
        __typename
        code
        id
        isVisible
        name
        unitName
      }
      totalCount
    }
  }
}
    `;
export const StockCountsDocument = gql`
    query stockCounts($daysTillExpired: Int, $timezoneOffset: Int) {
  stockCounts(daysTillExpired: $daysTillExpired, timezoneOffset: $timezoneOffset) {
    expired
    expiringSoon
  }
}
    `;
export const LocationsDocument = gql`
    query locations($sort: [LocationSortInput!]) {
  locations(sort: $sort) {
    __typename
    ... on LocationConnector {
      __typename
      nodes {
        __typename
        id
        name
        onHold
        code
      }
      totalCount
    }
    ... on ConnectorError {
      __typename
      error {
        description
        ... on DatabaseError {
          __typename
          description
          fullError
        }
        ... on PaginationError {
          __typename
          description
          rangeError {
            description
            field
            max
            min
          }
        }
      }
    }
  }
}
    `;
export const InsertLocationDocument = gql`
    mutation insertLocation($input: InsertLocationInput!) {
  insertLocation(input: $input) {
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
    mutation updateLocation($input: UpdateLocationInput!) {
  updateLocation(input: $input) {
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
export const StoresDocument = gql`
    query stores($first: Int, $offset: Int, $filter: StoreFilterInput) {
  stores(page: {first: $first, offset: $offset}, filter: $filter) {
    ... on StoreConnector {
      __typename
      nodes {
        code
        id
      }
      totalCount
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
    query masterLists($first: Int, $offset: Int, $key: MasterListSortFieldInput!, $desc: Boolean, $filter: MasterListFilterInput) {
  masterLists(
    filter: $filter
    page: {first: $first, offset: $offset}
    sort: {key: $key, desc: $desc}
  ) {
    ... on MasterListConnector {
      __typename
      nodes {
        name
        code
        lines {
          nodes {
            id
            itemId
            item {
              code
              id
              unitName
              name
              isVisible
              availableBatches {
                ... on ConnectorError {
                  __typename
                  error {
                    ... on PaginationError {
                      __typename
                      description
                      rangeError {
                        description
                        min
                        max
                        field
                      }
                    }
                    ... on DatabaseError {
                      __typename
                      description
                      fullError
                    }
                    description
                  }
                }
                ... on StockLineConnector {
                  __typename
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
                  totalCount
                }
              }
            }
          }
          totalCount
        }
        code
        description
        id
      }
      totalCount
    }
    ... on ConnectorError {
      __typename
      error {
        description
        ... on DatabaseError {
          __typename
          description
          fullError
        }
        ... on PaginationError {
          __typename
          description
          rangeError {
            field
            min
            max
            description
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
    names(variables: NamesQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<NamesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<NamesQuery>(NamesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'names');
    },
    itemsWithStockLines(variables: ItemsWithStockLinesQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<ItemsWithStockLinesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ItemsWithStockLinesQuery>(ItemsWithStockLinesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'itemsWithStockLines');
    },
    itemsListView(variables: ItemsListViewQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<ItemsListViewQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<ItemsListViewQuery>(ItemsListViewDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'itemsListView');
    },
    stockCounts(variables?: StockCountsQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<StockCountsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<StockCountsQuery>(StockCountsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'stockCounts');
    },
    locations(variables?: LocationsQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<LocationsQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<LocationsQuery>(LocationsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'locations');
    },
    insertLocation(variables: InsertLocationMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<InsertLocationMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertLocationMutation>(InsertLocationDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertLocation');
    },
    updateLocation(variables: UpdateLocationMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<UpdateLocationMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateLocationMutation>(UpdateLocationDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateLocation');
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
 * mockNamesQuery((req, res, ctx) => {
 *   const { key, desc, first, offset, filter } = req.variables;
 *   return res(
 *     ctx.data({ names })
 *   )
 * })
 */
export const mockNamesQuery = (resolver: ResponseResolver<GraphQLRequest<NamesQueryVariables>, GraphQLContext<NamesQuery>, any>) =>
  graphql.query<NamesQuery, NamesQueryVariables>(
    'names',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockItemsWithStockLinesQuery((req, res, ctx) => {
 *   const { first, offset, key, desc, filter, storeId } = req.variables;
 *   return res(
 *     ctx.data({ items })
 *   )
 * })
 */
export const mockItemsWithStockLinesQuery = (resolver: ResponseResolver<GraphQLRequest<ItemsWithStockLinesQueryVariables>, GraphQLContext<ItemsWithStockLinesQuery>, any>) =>
  graphql.query<ItemsWithStockLinesQuery, ItemsWithStockLinesQueryVariables>(
    'itemsWithStockLines',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockItemsListViewQuery((req, res, ctx) => {
 *   const { first, offset, key, desc, filter } = req.variables;
 *   return res(
 *     ctx.data({ items })
 *   )
 * })
 */
export const mockItemsListViewQuery = (resolver: ResponseResolver<GraphQLRequest<ItemsListViewQueryVariables>, GraphQLContext<ItemsListViewQuery>, any>) =>
  graphql.query<ItemsListViewQuery, ItemsListViewQueryVariables>(
    'itemsListView',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockStockCountsQuery((req, res, ctx) => {
 *   const { daysTillExpired, timezoneOffset } = req.variables;
 *   return res(
 *     ctx.data({ stockCounts })
 *   )
 * })
 */
export const mockStockCountsQuery = (resolver: ResponseResolver<GraphQLRequest<StockCountsQueryVariables>, GraphQLContext<StockCountsQuery>, any>) =>
  graphql.query<StockCountsQuery, StockCountsQueryVariables>(
    'stockCounts',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockLocationsQuery((req, res, ctx) => {
 *   const { sort } = req.variables;
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
 *   const { input } = req.variables;
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
 *   const { input } = req.variables;
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
 *   const { first, offset, key, desc, filter } = req.variables;
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
