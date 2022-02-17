import * as Types from '../../../common/src/types/schema';

import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/dist/types.dom';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type UpdateInboundShipmentMutationVariables = Types.Exact<{
  input: Types.UpdateInboundShipmentInput;
}>;


export type UpdateInboundShipmentMutation = { __typename?: 'Mutations', updateInboundShipment: { __typename: 'InvoiceNode', id: string } | { __typename: 'NodeError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'UpdateInboundShipmentError', error: { __typename?: 'CannotChangeStatusOfInvoiceOnHold', description: string } | { __typename?: 'CannotEditInvoice', description: string } | { __typename?: 'CannotReverseInvoiceStatus', description: string } | { __typename?: 'DatabaseError', description: string } | { __typename?: 'ForeignKeyError', description: string } | { __typename?: 'InvoiceDoesNotBelongToCurrentStore', description: string } | { __typename?: 'NotAnInboundShipment', description: string } | { __typename?: 'OtherPartyNotASupplier', description: string } | { __typename?: 'RecordNotFound', description: string } } };

export type DeleteInboundShipmentsMutationVariables = Types.Exact<{
  deleteInboundShipments: Array<Types.DeleteInboundShipmentInput> | Types.DeleteInboundShipmentInput;
}>;


export type DeleteInboundShipmentsMutation = { __typename?: 'Mutations', batchInboundShipment: { __typename: 'BatchInboundShipmentResponse', deleteInboundShipments?: Array<{ __typename?: 'DeleteInboundShipmentResponseWithId', id: string, response: { __typename: 'DeleteInboundShipmentError', error: { __typename?: 'CannotDeleteInvoiceWithLines', description: string } | { __typename?: 'CannotEditInvoice', description: string } | { __typename?: 'DatabaseError', description: string } | { __typename?: 'InvoiceDoesNotBelongToCurrentStore', description: string } | { __typename?: 'NotAnInboundShipment', description: string } | { __typename?: 'RecordNotFound', description: string } } | { __typename?: 'DeleteResponse', id: string } }> | null } };

export type InsertInboundShipmentMutationVariables = Types.Exact<{
  id: Types.Scalars['String'];
  otherPartyId: Types.Scalars['String'];
}>;


export type InsertInboundShipmentMutation = { __typename?: 'Mutations', insertInboundShipment: { __typename: 'InsertInboundShipmentError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'ForeignKeyError', description: string, key: Types.ForeignKey } | { __typename: 'OtherPartyNotASupplier', description: string, otherParty: { __typename?: 'NameNode', code: string, id: string, isCustomer: boolean, isSupplier: boolean, name: string } } | { __typename: 'RecordAlreadyExist', description: string } } | { __typename: 'InvoiceNode', id: string } | { __typename: 'NodeError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'RecordNotFound', description: string } } };


export const UpdateInboundShipmentDocument = gql`
    mutation updateInboundShipment($input: UpdateInboundShipmentInput!) {
  updateInboundShipment(input: $input) {
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
    ... on UpdateInboundShipmentError {
      __typename
      error {
        description
      }
    }
  }
}
    `;
export const DeleteInboundShipmentsDocument = gql`
    mutation deleteInboundShipments($deleteInboundShipments: [DeleteInboundShipmentInput!]!) {
  batchInboundShipment(input: {deleteInboundShipments: $deleteInboundShipments}) {
    __typename
    deleteInboundShipments {
      id
      response {
        ... on DeleteInboundShipmentError {
          __typename
          error {
            description
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
export const InsertInboundShipmentDocument = gql`
    mutation insertInboundShipment($id: String!, $otherPartyId: String!) {
  insertInboundShipment(input: {id: $id, otherPartyId: $otherPartyId}) {
    __typename
    ... on InvoiceNode {
      id
    }
    ... on InsertInboundShipmentError {
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
        ... on OtherPartyNotASupplier {
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

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    updateInboundShipment(variables: UpdateInboundShipmentMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<UpdateInboundShipmentMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateInboundShipmentMutation>(UpdateInboundShipmentDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateInboundShipment');
    },
    deleteInboundShipments(variables: DeleteInboundShipmentsMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<DeleteInboundShipmentsMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeleteInboundShipmentsMutation>(DeleteInboundShipmentsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'deleteInboundShipments');
    },
    insertInboundShipment(variables: InsertInboundShipmentMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<InsertInboundShipmentMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertInboundShipmentMutation>(InsertInboundShipmentDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertInboundShipment');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockUpdateInboundShipmentMutation((req, res, ctx) => {
 *   const { input } = req.variables;
 *   return res(
 *     ctx.data({ updateInboundShipment })
 *   )
 * })
 */
export const mockUpdateInboundShipmentMutation = (resolver: ResponseResolver<GraphQLRequest<UpdateInboundShipmentMutationVariables>, GraphQLContext<UpdateInboundShipmentMutation>, any>) =>
  graphql.mutation<UpdateInboundShipmentMutation, UpdateInboundShipmentMutationVariables>(
    'updateInboundShipment',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockDeleteInboundShipmentsMutation((req, res, ctx) => {
 *   const { deleteInboundShipments } = req.variables;
 *   return res(
 *     ctx.data({ batchInboundShipment })
 *   )
 * })
 */
export const mockDeleteInboundShipmentsMutation = (resolver: ResponseResolver<GraphQLRequest<DeleteInboundShipmentsMutationVariables>, GraphQLContext<DeleteInboundShipmentsMutation>, any>) =>
  graphql.mutation<DeleteInboundShipmentsMutation, DeleteInboundShipmentsMutationVariables>(
    'deleteInboundShipments',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInsertInboundShipmentMutation((req, res, ctx) => {
 *   const { id, otherPartyId } = req.variables;
 *   return res(
 *     ctx.data({ insertInboundShipment })
 *   )
 * })
 */
export const mockInsertInboundShipmentMutation = (resolver: ResponseResolver<GraphQLRequest<InsertInboundShipmentMutationVariables>, GraphQLContext<InsertInboundShipmentMutation>, any>) =>
  graphql.mutation<InsertInboundShipmentMutation, InsertInboundShipmentMutationVariables>(
    'insertInboundShipment',
    resolver
  )
