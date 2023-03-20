import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/src/types.dom';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw';
export type LocationRowFragment = {
  __typename: 'LocationNode';
  id: string;
  name: string;
  onHold: boolean;
  code: string;
};

export type LocationsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  sort?: Types.InputMaybe<
    Array<Types.LocationSortInput> | Types.LocationSortInput
  >;
}>;

export type LocationsQuery = {
  __typename: 'Queries';
  locations: {
    __typename: 'LocationConnector';
    totalCount: number;
    nodes: Array<{
      __typename: 'LocationNode';
      id: string;
      name: string;
      onHold: boolean;
      code: string;
    }>;
  };
};

export type InsertLocationMutationVariables = Types.Exact<{
  input: Types.InsertLocationInput;
  storeId: Types.Scalars['String'];
}>;

export type InsertLocationMutation = {
  __typename: 'Mutations';
  insertLocation:
    | {
        __typename: 'InsertLocationError';
        error:
          | {
              __typename: 'DatabaseError';
              description: string;
              fullError: string;
            }
          | {
              __typename: 'InternalError';
              description: string;
              fullError: string;
            }
          | { __typename: 'RecordAlreadyExist'; description: string }
          | {
              __typename: 'UniqueValueViolation';
              description: string;
              field: Types.UniqueValueKey;
            };
      }
    | {
        __typename: 'LocationNode';
        id: string;
        name: string;
        code: string;
        onHold: boolean;
      };
};

export type UpdateLocationMutationVariables = Types.Exact<{
  input: Types.UpdateLocationInput;
  storeId: Types.Scalars['String'];
}>;

export type UpdateLocationMutation = {
  __typename: 'Mutations';
  updateLocation:
    | {
        __typename: 'LocationNode';
        id: string;
        name: string;
        onHold: boolean;
        code: string;
      }
    | {
        __typename: 'UpdateLocationError';
        error:
          | {
              __typename: 'DatabaseError';
              description: string;
              fullError: string;
            }
          | {
              __typename: 'InternalError';
              description: string;
              fullError: string;
            }
          | { __typename: 'RecordBelongsToAnotherStore'; description: string }
          | { __typename: 'RecordNotFound'; description: string }
          | {
              __typename: 'UniqueValueViolation';
              description: string;
              field: Types.UniqueValueKey;
            };
      };
};

export type DeleteLocationMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String'];
  input: Types.DeleteLocationInput;
}>;

export type DeleteLocationMutation = {
  __typename: 'Mutations';
  deleteLocation:
    | {
        __typename: 'DeleteLocationError';
        error:
          | {
              __typename: 'DatabaseError';
              description: string;
              fullError: string;
            }
          | {
              __typename: 'LocationInUse';
              description: string;
              stockLines: {
                __typename: 'StockLineConnector';
                totalCount: number;
                nodes: Array<{
                  __typename: 'StockLineNode';
                  id: string;
                  itemId: string;
                }>;
              };
              invoiceLines: {
                __typename: 'InvoiceLineConnector';
                totalCount: number;
                nodes: Array<{ __typename: 'InvoiceLineNode'; id: string }>;
              };
            }
          | { __typename: 'RecordBelongsToAnotherStore'; description: string }
          | { __typename: 'RecordNotFound'; description: string };
      }
    | { __typename: 'DeleteResponse'; id: string };
};

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

export type SdkFunctionWrapper = <T>(
  action: (requestHeaders?: Record<string, string>) => Promise<T>,
  operationName: string,
  operationType?: string
) => Promise<T>;

const defaultWrapper: SdkFunctionWrapper = (
  action,
  _operationName,
  _operationType
) => action();

export function getSdk(
  client: GraphQLClient,
  withWrapper: SdkFunctionWrapper = defaultWrapper
) {
  return {
    locations(
      variables: LocationsQueryVariables,
      requestHeaders?: Dom.RequestInit['headers']
    ): Promise<LocationsQuery> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<LocationsQuery>(LocationsDocument, variables, {
            ...requestHeaders,
            ...wrappedRequestHeaders,
          }),
        'locations',
        'query'
      );
    },
    insertLocation(
      variables: InsertLocationMutationVariables,
      requestHeaders?: Dom.RequestInit['headers']
    ): Promise<InsertLocationMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<InsertLocationMutation>(
            InsertLocationDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'insertLocation',
        'mutation'
      );
    },
    updateLocation(
      variables: UpdateLocationMutationVariables,
      requestHeaders?: Dom.RequestInit['headers']
    ): Promise<UpdateLocationMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<UpdateLocationMutation>(
            UpdateLocationDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'updateLocation',
        'mutation'
      );
    },
    deleteLocation(
      variables: DeleteLocationMutationVariables,
      requestHeaders?: Dom.RequestInit['headers']
    ): Promise<DeleteLocationMutation> {
      return withWrapper(
        wrappedRequestHeaders =>
          client.request<DeleteLocationMutation>(
            DeleteLocationDocument,
            variables,
            { ...requestHeaders, ...wrappedRequestHeaders }
          ),
        'deleteLocation',
        'mutation'
      );
    },
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
export const mockLocationsQuery = (
  resolver: ResponseResolver<
    GraphQLRequest<LocationsQueryVariables>,
    GraphQLContext<LocationsQuery>,
    any
  >
) =>
  graphql.query<LocationsQuery, LocationsQueryVariables>('locations', resolver);

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
export const mockInsertLocationMutation = (
  resolver: ResponseResolver<
    GraphQLRequest<InsertLocationMutationVariables>,
    GraphQLContext<InsertLocationMutation>,
    any
  >
) =>
  graphql.mutation<InsertLocationMutation, InsertLocationMutationVariables>(
    'insertLocation',
    resolver
  );

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
export const mockUpdateLocationMutation = (
  resolver: ResponseResolver<
    GraphQLRequest<UpdateLocationMutationVariables>,
    GraphQLContext<UpdateLocationMutation>,
    any
  >
) =>
  graphql.mutation<UpdateLocationMutation, UpdateLocationMutationVariables>(
    'updateLocation',
    resolver
  );

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
export const mockDeleteLocationMutation = (
  resolver: ResponseResolver<
    GraphQLRequest<DeleteLocationMutationVariables>,
    GraphQLContext<DeleteLocationMutation>,
    any
  >
) =>
  graphql.mutation<DeleteLocationMutation, DeleteLocationMutationVariables>(
    'deleteLocation',
    resolver
  );
