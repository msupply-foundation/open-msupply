import * as Types from '../../../../../../packages/common/src/types/schema';

import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/dist/types.dom';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type InsertOutboundShipmentMutationVariables = Types.Exact<{
  id: Types.Scalars['String'];
  otherPartyId: Types.Scalars['String'];
}>;


export type InsertOutboundShipmentMutation = { __typename?: 'Mutations', insertOutboundShipment: { __typename: 'InsertOutboundShipmentError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'ForeignKeyError', description: string, key: Types.ForeignKey } | { __typename: 'OtherPartyCannotBeThisStoreError', description: string } | { __typename: 'OtherPartyNotACustomerError', description: string, otherParty: { __typename?: 'NameNode', code: string, id: string, isCustomer: boolean, isSupplier: boolean, name: string } } | { __typename: 'RecordAlreadyExist', description: string } } | { __typename: 'InvoiceNode', id: string } | { __typename: 'NodeError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'RecordNotFound', description: string } } };

export type UpdateOutboundShipmentMutationVariables = Types.Exact<{
  input: Types.UpdateOutboundShipmentInput;
}>;


export type UpdateOutboundShipmentMutation = { __typename?: 'Mutations', updateOutboundShipment: { __typename: 'InvoiceNode', id: string } | { __typename: 'NodeError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'UpdateOutboundShipmentError', error: { __typename?: 'CanOnlyChangeToAllocatedWhenNoUnallocatedLines', description: string } | { __typename?: 'CanOnlyEditInvoicesInLoggedInStoreError', description: string } | { __typename?: 'CannotChangeStatusOfInvoiceOnHold', description: string } | { __typename?: 'CannotReverseInvoiceStatus', description: string } | { __typename?: 'DatabaseError', description: string } | { __typename?: 'ForeignKeyError', description: string } | { __typename?: 'InvoiceIsNotEditable', description: string } | { __typename?: 'InvoiceLineHasNoStockLineError', description: string } | { __typename?: 'NotAnOutboundShipmentError', description: string } | { __typename?: 'OtherPartyCannotBeThisStoreError', description: string } | { __typename?: 'OtherPartyNotACustomerError', description: string } | { __typename?: 'RecordNotFound', description: string } } };

export type DeleteOutboundShipmentsMutationVariables = Types.Exact<{
  deleteOutboundShipments: Array<Types.Scalars['String']> | Types.Scalars['String'];
}>;


export type DeleteOutboundShipmentsMutation = { __typename?: 'Mutations', batchOutboundShipment: { __typename: 'BatchOutboundShipmentResponse', deleteOutboundShipments?: Array<{ __typename: 'DeleteOutboundShipmentResponseWithId', id: string }> | null } };

export type UpsertOutboundShipmentMutationVariables = Types.Exact<{
  input: Types.BatchOutboundShipmentInput;
}>;


export type UpsertOutboundShipmentMutation = { __typename?: 'Mutations', batchOutboundShipment: { __typename?: 'BatchOutboundShipmentResponse', deleteOutboundShipmentLines?: Array<{ __typename?: 'DeleteOutboundShipmentLineResponseWithId', id: string }> | null, deleteOutboundShipmentServiceLines?: Array<{ __typename?: 'DeleteOutboundShipmentServiceLineResponseWithId', id: string }> | null, deleteOutboundShipmentUnallocatedLines?: Array<{ __typename?: 'DeleteOutboundShipmentUnallocatedLineResponseWithId', id: string }> | null, insertOutboundShipmentLines?: Array<{ __typename?: 'InsertOutboundShipmentLineResponseWithId', id: string }> | null, insertOutboundShipmentServiceLines?: Array<{ __typename?: 'InsertOutboundShipmentServiceLineResponseWithId', id: string }> | null, insertOutboundShipmentUnallocatedLines?: Array<{ __typename?: 'InsertOutboundShipmentUnallocatedLineResponseWithId', id: string }> | null, updateOutboundShipmentLines?: Array<{ __typename?: 'UpdateOutboundShipmentLineResponseWithId', id: string }> | null, updateOutboundShipmentServiceLines?: Array<{ __typename?: 'UpdateOutboundShipmentServiceLineResponseWithId', id: string }> | null, updateOutboundShipmentUnallocatedLines?: Array<{ __typename?: 'UpdateOutboundShipmentUnallocatedLineResponseWithId', id: string }> | null, updateOutboundShipments?: Array<{ __typename?: 'UpdateOutboundShipmentResponseWithId', id: string }> | null } };

export type DeleteOutboundShipmentLinesMutationVariables = Types.Exact<{
  deleteOutboundShipmentLines: Array<Types.DeleteOutboundShipmentLineInput> | Types.DeleteOutboundShipmentLineInput;
}>;


export type DeleteOutboundShipmentLinesMutation = { __typename?: 'Mutations', batchOutboundShipment: { __typename?: 'BatchOutboundShipmentResponse', deleteOutboundShipmentLines?: Array<{ __typename?: 'DeleteOutboundShipmentLineResponseWithId', id: string, response: { __typename: 'DeleteOutboundShipmentLineError', error: { __typename: 'CannotEditInvoice', description: string } | { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'ForeignKeyError', description: string, key: Types.ForeignKey } | { __typename: 'InvoiceDoesNotBelongToCurrentStore', description: string } | { __typename: 'InvoiceLineBelongsToAnotherInvoice', description: string } | { __typename: 'NotAnOutboundShipment', description: string } | { __typename: 'RecordNotFound', description: string } } | { __typename?: 'DeleteResponse', id: string } }> | null } };


export const InsertOutboundShipmentDocument = gql`
    mutation insertOutboundShipment($id: String!, $otherPartyId: String!) {
  insertOutboundShipment(input: {id: $id, otherPartyId: $otherPartyId}) {
    __typename
    ... on InvoiceNode {
      id
    }
    ... on InsertOutboundShipmentError {
      __typename
      error {
        description
        ... on DatabaseError {
          __typename
          description
          fullError
        }
        ... on ForeignKeyError {
          __typename
          description
          key
        }
        ... on OtherPartyCannotBeThisStoreError {
          __typename
          description
        }
        ... on OtherPartyNotACustomerError {
          __typename
          description
          otherParty {
            code
            id
            isCustomer
            isSupplier
            name
          }
        }
        ... on RecordAlreadyExist {
          __typename
          description
        }
      }
    }
    ... on NodeError {
      __typename
      error {
        description
        ... on DatabaseError {
          __typename
          description
          fullError
        }
        ... on RecordNotFound {
          __typename
          description
        }
      }
    }
  }
}
    `;
export const UpdateOutboundShipmentDocument = gql`
    mutation updateOutboundShipment($input: UpdateOutboundShipmentInput!) {
  updateOutboundShipment(input: $input) {
    ... on InvoiceNode {
      __typename
      id
    }
    ... on NodeError {
      __typename
      error {
        description
        ... on DatabaseError {
          __typename
          description
          fullError
        }
        ... on RecordNotFound {
          __typename
          description
        }
      }
    }
    ... on UpdateOutboundShipmentError {
      __typename
      error {
        description
      }
    }
  }
}
    `;
export const DeleteOutboundShipmentsDocument = gql`
    mutation deleteOutboundShipments($deleteOutboundShipments: [String!]!) {
  batchOutboundShipment(
    input: {deleteOutboundShipments: $deleteOutboundShipments}
  ) {
    __typename
    deleteOutboundShipments {
      __typename
      id
    }
  }
}
    `;
export const UpsertOutboundShipmentDocument = gql`
    mutation upsertOutboundShipment($input: BatchOutboundShipmentInput!) {
  batchOutboundShipment(input: $input) {
    deleteOutboundShipmentLines {
      id
    }
    deleteOutboundShipmentServiceLines {
      id
    }
    deleteOutboundShipmentUnallocatedLines {
      id
    }
    insertOutboundShipmentLines {
      id
    }
    insertOutboundShipmentServiceLines {
      id
    }
    insertOutboundShipmentUnallocatedLines {
      id
    }
    updateOutboundShipmentLines {
      id
    }
    updateOutboundShipmentServiceLines {
      id
    }
    updateOutboundShipmentUnallocatedLines {
      id
    }
    updateOutboundShipments {
      id
    }
  }
}
    `;
export const DeleteOutboundShipmentLinesDocument = gql`
    mutation deleteOutboundShipmentLines($deleteOutboundShipmentLines: [DeleteOutboundShipmentLineInput!]!) {
  batchOutboundShipment(
    input: {deleteOutboundShipmentLines: $deleteOutboundShipmentLines}
  ) {
    deleteOutboundShipmentLines {
      id
      response {
        ... on DeleteOutboundShipmentLineError {
          __typename
          error {
            description
            ... on RecordNotFound {
              __typename
              description
            }
            ... on CannotEditInvoice {
              __typename
              description
            }
            ... on DatabaseError {
              __typename
              description
              fullError
            }
            ... on ForeignKeyError {
              __typename
              description
              key
            }
            ... on InvoiceDoesNotBelongToCurrentStore {
              __typename
              description
            }
            ... on InvoiceLineBelongsToAnotherInvoice {
              __typename
              description
            }
            ... on NotAnOutboundShipment {
              __typename
              description
            }
          }
        }
        ... on DeleteResponse {
          id
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
    insertOutboundShipment(variables: InsertOutboundShipmentMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<InsertOutboundShipmentMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertOutboundShipmentMutation>(InsertOutboundShipmentDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertOutboundShipment');
    },
    updateOutboundShipment(variables: UpdateOutboundShipmentMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<UpdateOutboundShipmentMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateOutboundShipmentMutation>(UpdateOutboundShipmentDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateOutboundShipment');
    },
    deleteOutboundShipments(variables: DeleteOutboundShipmentsMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<DeleteOutboundShipmentsMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeleteOutboundShipmentsMutation>(DeleteOutboundShipmentsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'deleteOutboundShipments');
    },
    upsertOutboundShipment(variables: UpsertOutboundShipmentMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<UpsertOutboundShipmentMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpsertOutboundShipmentMutation>(UpsertOutboundShipmentDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'upsertOutboundShipment');
    },
    deleteOutboundShipmentLines(variables: DeleteOutboundShipmentLinesMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<DeleteOutboundShipmentLinesMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeleteOutboundShipmentLinesMutation>(DeleteOutboundShipmentLinesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'deleteOutboundShipmentLines');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInsertOutboundShipmentMutation((req, res, ctx) => {
 *   const { id, otherPartyId } = req.variables;
 *   return res(
 *     ctx.data({ insertOutboundShipment })
 *   )
 * })
 */
export const mockInsertOutboundShipmentMutation = (resolver: ResponseResolver<GraphQLRequest<InsertOutboundShipmentMutationVariables>, GraphQLContext<InsertOutboundShipmentMutation>, any>) =>
  graphql.mutation<InsertOutboundShipmentMutation, InsertOutboundShipmentMutationVariables>(
    'insertOutboundShipment',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockUpdateOutboundShipmentMutation((req, res, ctx) => {
 *   const { input } = req.variables;
 *   return res(
 *     ctx.data({ updateOutboundShipment })
 *   )
 * })
 */
export const mockUpdateOutboundShipmentMutation = (resolver: ResponseResolver<GraphQLRequest<UpdateOutboundShipmentMutationVariables>, GraphQLContext<UpdateOutboundShipmentMutation>, any>) =>
  graphql.mutation<UpdateOutboundShipmentMutation, UpdateOutboundShipmentMutationVariables>(
    'updateOutboundShipment',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockDeleteOutboundShipmentsMutation((req, res, ctx) => {
 *   const { deleteOutboundShipments } = req.variables;
 *   return res(
 *     ctx.data({ batchOutboundShipment })
 *   )
 * })
 */
export const mockDeleteOutboundShipmentsMutation = (resolver: ResponseResolver<GraphQLRequest<DeleteOutboundShipmentsMutationVariables>, GraphQLContext<DeleteOutboundShipmentsMutation>, any>) =>
  graphql.mutation<DeleteOutboundShipmentsMutation, DeleteOutboundShipmentsMutationVariables>(
    'deleteOutboundShipments',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockUpsertOutboundShipmentMutation((req, res, ctx) => {
 *   const { input } = req.variables;
 *   return res(
 *     ctx.data({ batchOutboundShipment })
 *   )
 * })
 */
export const mockUpsertOutboundShipmentMutation = (resolver: ResponseResolver<GraphQLRequest<UpsertOutboundShipmentMutationVariables>, GraphQLContext<UpsertOutboundShipmentMutation>, any>) =>
  graphql.mutation<UpsertOutboundShipmentMutation, UpsertOutboundShipmentMutationVariables>(
    'upsertOutboundShipment',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockDeleteOutboundShipmentLinesMutation((req, res, ctx) => {
 *   const { deleteOutboundShipmentLines } = req.variables;
 *   return res(
 *     ctx.data({ batchOutboundShipment })
 *   )
 * })
 */
export const mockDeleteOutboundShipmentLinesMutation = (resolver: ResponseResolver<GraphQLRequest<DeleteOutboundShipmentLinesMutationVariables>, GraphQLContext<DeleteOutboundShipmentLinesMutation>, any>) =>
  graphql.mutation<DeleteOutboundShipmentLinesMutation, DeleteOutboundShipmentLinesMutationVariables>(
    'deleteOutboundShipmentLines',
    resolver
  )
