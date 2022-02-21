import * as Types from '@openmsupply-client/common';

import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/dist/types.dom';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type InvoicesQueryVariables = Types.Exact<{
  first?: Types.InputMaybe<Types.Scalars['Int']>;
  offset?: Types.InputMaybe<Types.Scalars['Int']>;
  key: Types.InvoiceSortFieldInput;
  desc?: Types.InputMaybe<Types.Scalars['Boolean']>;
  filter?: Types.InputMaybe<Types.InvoiceFilterInput>;
  storeId: Types.Scalars['String'];
}>;


export type InvoicesQuery = { __typename: 'Queries', invoices: { __typename: 'ConnectorError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'PaginationError', description: string, rangeError: { __typename: 'RangeError', description: string, field: Types.RangeField, max?: number | null, min?: number | null } } } | { __typename: 'InvoiceConnector', totalCount: number, nodes: Array<{ __typename: 'InvoiceNode', comment?: string | null, createdDatetime: string, allocatedDatetime?: string | null, deliveredDatetime?: string | null, pickedDatetime?: string | null, shippedDatetime?: string | null, verifiedDatetime?: string | null, id: string, invoiceNumber: number, otherPartyId: string, otherPartyName: string, theirReference?: string | null, type: Types.InvoiceNodeType, status: Types.InvoiceNodeStatus, colour?: string | null, pricing: { __typename: 'InvoicePricingNode', totalAfterTax: number, totalBeforeTax: number, stockTotalBeforeTax: number, stockTotalAfterTax: number, serviceTotalAfterTax: number, serviceTotalBeforeTax: number } | { __typename: 'NodeError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'RecordNotFound', description: string } } }> } };

export type InvoiceQueryVariables = Types.Exact<{
  id: Types.Scalars['String'];
  storeId: Types.Scalars['String'];
}>;


export type InvoiceQuery = { __typename: 'Queries', invoice: { __typename: 'InvoiceNode', id: string, comment?: string | null, createdDatetime: string, allocatedDatetime?: string | null, deliveredDatetime?: string | null, pickedDatetime?: string | null, shippedDatetime?: string | null, verifiedDatetime?: string | null, invoiceNumber: number, colour?: string | null, onHold: boolean, otherPartyId: string, otherPartyName: string, status: Types.InvoiceNodeStatus, theirReference?: string | null, type: Types.InvoiceNodeType, otherParty: { __typename: 'NameNode', id: string, name: string, code: string, isCustomer: boolean, isSupplier: boolean } | { __typename: 'NodeError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'RecordNotFound', description: string } }, lines: { __typename: 'ConnectorError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'PaginationError', description: string } } | { __typename: 'InvoiceLineConnector', totalCount: number, nodes: Array<{ __typename: 'InvoiceLineNode', type: Types.InvoiceLineNodeType, batch?: string | null, costPricePerPack: number, expiryDate?: string | null, id: string, itemCode: string, itemId: string, itemName: string, numberOfPacks: number, packSize: number, note?: string | null, invoiceId: string, locationName?: string | null, sellPricePerPack: number, location?: { __typename: 'LocationNode', id: string, name: string, code: string, onHold: boolean, stock: { __typename: 'ConnectorError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'PaginationError', description: string } } | { __typename: 'StockLineConnector', totalCount: number, nodes: Array<{ __typename: 'StockLineNode', id: string, costPricePerPack: number, itemId: string, availableNumberOfPacks: number, onHold: boolean, packSize: number, sellPricePerPack: number, storeId: string, totalNumberOfPacks: number }> } } | { __typename: 'NodeError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'RecordNotFound', description: string } } | null, item: { __typename: 'ItemError', error: { __typename: 'InternalError', description: string, fullError: string } } | { __typename: 'ItemNode', id: string, name: string, code: string, isVisible: boolean, unitName?: string | null, availableBatches: { __typename: 'ConnectorError', error: { __typename: 'DatabaseError', description: string } | { __typename: 'PaginationError', description: string } } | { __typename: 'StockLineConnector', totalCount: number, nodes: Array<{ __typename: 'StockLineNode', id: string, availableNumberOfPacks: number, costPricePerPack: number, itemId: string, onHold: boolean, packSize: number, sellPricePerPack: number, storeId: string, totalNumberOfPacks: number, expiryDate?: string | null }> } }, stockLine?: { __typename: 'NodeError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'StockLineNode', availableNumberOfPacks: number, batch?: string | null, costPricePerPack: number, expiryDate?: string | null, id: string, itemId: string, packSize: number, sellPricePerPack: number, storeId: string, totalNumberOfPacks: number, onHold: boolean, note?: string | null } | null }> }, pricing: { __typename: 'InvoicePricingNode', totalAfterTax: number, totalBeforeTax: number, stockTotalBeforeTax: number, stockTotalAfterTax: number, serviceTotalAfterTax: number, serviceTotalBeforeTax: number } | { __typename: 'NodeError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'RecordNotFound', description: string } } } | { __typename: 'NodeError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'RecordNotFound', description: string } } };

export type UpdateInboundShipmentMutationVariables = Types.Exact<{
  input: Types.UpdateInboundShipmentInput;
}>;


export type UpdateInboundShipmentMutation = { __typename: 'Mutations', updateInboundShipment: { __typename: 'InvoiceNode', id: string } | { __typename: 'NodeError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'UpdateInboundShipmentError', error: { __typename: 'CannotChangeStatusOfInvoiceOnHold', description: string } | { __typename: 'CannotEditInvoice', description: string } | { __typename: 'CannotReverseInvoiceStatus', description: string } | { __typename: 'DatabaseError', description: string } | { __typename: 'ForeignKeyError', description: string } | { __typename: 'InvoiceDoesNotBelongToCurrentStore', description: string } | { __typename: 'NotAnInboundShipment', description: string } | { __typename: 'OtherPartyNotASupplier', description: string } | { __typename: 'RecordNotFound', description: string } } };

export type DeleteInboundShipmentsMutationVariables = Types.Exact<{
  deleteInboundShipments: Array<Types.DeleteInboundShipmentInput> | Types.DeleteInboundShipmentInput;
}>;


export type DeleteInboundShipmentsMutation = { __typename: 'Mutations', batchInboundShipment: { __typename: 'BatchInboundShipmentResponse', deleteInboundShipments?: Array<{ __typename: 'DeleteInboundShipmentResponseWithId', id: string, response: { __typename: 'DeleteInboundShipmentError', error: { __typename: 'CannotDeleteInvoiceWithLines', description: string } | { __typename: 'CannotEditInvoice', description: string } | { __typename: 'DatabaseError', description: string } | { __typename: 'InvoiceDoesNotBelongToCurrentStore', description: string } | { __typename: 'NotAnInboundShipment', description: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'DeleteResponse', id: string } }> | null } };

export type InsertInboundShipmentMutationVariables = Types.Exact<{
  id: Types.Scalars['String'];
  otherPartyId: Types.Scalars['String'];
}>;


export type InsertInboundShipmentMutation = { __typename: 'Mutations', insertInboundShipment: { __typename: 'InsertInboundShipmentError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'ForeignKeyError', description: string, key: Types.ForeignKey } | { __typename: 'OtherPartyNotASupplier', description: string, otherParty: { __typename: 'NameNode', code: string, id: string, isCustomer: boolean, isSupplier: boolean, name: string } } | { __typename: 'RecordAlreadyExist', description: string } } | { __typename: 'InvoiceNode', id: string } | { __typename: 'NodeError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'RecordNotFound', description: string } } };

export type UpsertInboundShipmentMutationVariables = Types.Exact<{
  input: Types.BatchInboundShipmentInput;
}>;


export type UpsertInboundShipmentMutation = { __typename: 'Mutations', batchInboundShipment: { __typename: 'BatchInboundShipmentResponse', deleteInboundShipmentLines?: Array<{ __typename: 'DeleteInboundShipmentLineResponseWithId', id: string }> | null, insertInboundShipmentLines?: Array<{ __typename: 'InsertInboundShipmentLineResponseWithId', id: string }> | null, updateInboundShipmentLines?: Array<{ __typename: 'UpdateInboundShipmentLineResponseWithId', id: string }> | null, updateInboundShipments?: Array<{ __typename: 'UpdateInboundShipmentResponseWithId', id: string }> | null } };

export type DeleteInboundShipmentLinesMutationVariables = Types.Exact<{
  input: Types.BatchInboundShipmentInput;
}>;


export type DeleteInboundShipmentLinesMutation = { __typename: 'Mutations', batchInboundShipment: { __typename: 'BatchInboundShipmentResponse', deleteInboundShipmentLines?: Array<{ __typename: 'DeleteInboundShipmentLineResponseWithId', id: string, response: { __typename: 'DeleteInboundShipmentLineError', error: { __typename: 'BatchIsReserved', description: string } | { __typename: 'CannotEditInvoice', description: string } | { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'ForeignKeyError', description: string, key: Types.ForeignKey } | { __typename: 'InvoiceDoesNotBelongToCurrentStore', description: string } | { __typename: 'InvoiceLineBelongsToAnotherInvoice', description: string } | { __typename: 'NotAnInboundShipment', description: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'DeleteResponse', id: string } }> | null } };


export const InvoicesDocument = gql`
    query invoices($first: Int, $offset: Int, $key: InvoiceSortFieldInput!, $desc: Boolean, $filter: InvoiceFilterInput, $storeId: String!) {
  invoices(
    page: {first: $first, offset: $offset}
    sort: {key: $key, desc: $desc}
    filter: $filter
    storeId: $storeId
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
    ... on InvoiceConnector {
      __typename
      nodes {
        comment
        createdDatetime
        allocatedDatetime
        deliveredDatetime
        pickedDatetime
        shippedDatetime
        verifiedDatetime
        id
        invoiceNumber
        otherPartyId
        otherPartyName
        theirReference
        type
        status
        colour
        pricing {
          __typename
          ... on NodeError {
            __typename
            error {
              ... on RecordNotFound {
                __typename
                description
              }
              ... on DatabaseError {
                __typename
                description
                fullError
              }
              description
            }
          }
          ... on InvoicePricingNode {
            __typename
            totalAfterTax
            totalBeforeTax
            stockTotalBeforeTax
            stockTotalAfterTax
            serviceTotalAfterTax
            serviceTotalBeforeTax
          }
        }
      }
      totalCount
    }
  }
}
    `;
export const InvoiceDocument = gql`
    query invoice($id: String!, $storeId: String!) {
  invoice(id: $id, storeId: $storeId) {
    __typename
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
    ... on InvoiceNode {
      __typename
      id
      comment
      createdDatetime
      allocatedDatetime
      deliveredDatetime
      pickedDatetime
      shippedDatetime
      verifiedDatetime
      invoiceNumber
      colour
      onHold
      otherParty {
        __typename
        ... on NameNode {
          __typename
          id
          name
          code
          isCustomer
          isSupplier
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
      lines {
        ... on ConnectorError {
          __typename
          error {
            description
            ... on DatabaseError {
              __typename
              description
              fullError
            }
          }
        }
        ... on InvoiceLineConnector {
          __typename
          nodes {
            __typename
            type
            batch
            costPricePerPack
            expiryDate
            id
            itemCode
            itemId
            itemName
            numberOfPacks
            packSize
            note
            invoiceId
            location {
              __typename
              ... on LocationNode {
                __typename
                id
                name
                code
                onHold
                stock {
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
                    }
                  }
                  ... on StockLineConnector {
                    __typename
                    totalCount
                    nodes {
                      id
                      costPricePerPack
                      itemId
                      availableNumberOfPacks
                      onHold
                      packSize
                      sellPricePerPack
                      storeId
                      totalNumberOfPacks
                    }
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
            item {
              ... on ItemNode {
                __typename
                id
                name
                code
                isVisible
                unitName
                availableBatches(storeId: $storeId) {
                  ... on StockLineConnector {
                    totalCount
                    nodes {
                      id
                      availableNumberOfPacks
                      costPricePerPack
                      itemId
                      onHold
                      packSize
                      sellPricePerPack
                      storeId
                      totalNumberOfPacks
                      expiryDate
                    }
                  }
                  ... on ConnectorError {
                    __typename
                    error {
                      description
                    }
                  }
                }
              }
              ... on ItemError {
                __typename
                error {
                  ... on InternalError {
                    __typename
                    description
                    fullError
                  }
                }
              }
            }
            locationName
            sellPricePerPack
            stockLine {
              __typename
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
              ... on StockLineNode {
                __typename
                availableNumberOfPacks
                batch
                costPricePerPack
                expiryDate
                id
                itemId
                packSize
                sellPricePerPack
                storeId
                totalNumberOfPacks
                onHold
                note
              }
            }
          }
          totalCount
        }
      }
      otherPartyId
      otherPartyName
      pricing {
        __typename
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
        ... on InvoicePricingNode {
          __typename
          totalAfterTax
          totalBeforeTax
          stockTotalBeforeTax
          stockTotalAfterTax
          serviceTotalAfterTax
          serviceTotalBeforeTax
        }
      }
      status
      theirReference
      type
    }
  }
}
    `;
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
export const UpsertInboundShipmentDocument = gql`
    mutation upsertInboundShipment($input: BatchInboundShipmentInput!) {
  batchInboundShipment(input: $input) {
    deleteInboundShipmentLines {
      id
    }
    insertInboundShipmentLines {
      id
    }
    updateInboundShipmentLines {
      id
    }
    updateInboundShipments {
      id
    }
  }
}
    `;
export const DeleteInboundShipmentLinesDocument = gql`
    mutation deleteInboundShipmentLines($input: BatchInboundShipmentInput!) {
  batchInboundShipment(input: $input) {
    deleteInboundShipmentLines {
      id
      response {
        ... on DeleteResponse {
          id
        }
        ... on DeleteInboundShipmentLineError {
          __typename
          error {
            description
            ... on NotAnInboundShipment {
              __typename
              description
            }
            ... on InvoiceDoesNotBelongToCurrentStore {
              __typename
              description
            }
            ... on ForeignKeyError {
              __typename
              description
              key
            }
            ... on DatabaseError {
              __typename
              description
              fullError
            }
            ... on CannotEditInvoice {
              __typename
              description
            }
            ... on BatchIsReserved {
              __typename
              description
            }
            ... on RecordNotFound {
              __typename
              description
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
    invoices(variables: InvoicesQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<InvoicesQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<InvoicesQuery>(InvoicesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'invoices');
    },
    invoice(variables: InvoiceQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<InvoiceQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<InvoiceQuery>(InvoiceDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'invoice');
    },
    updateInboundShipment(variables: UpdateInboundShipmentMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<UpdateInboundShipmentMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpdateInboundShipmentMutation>(UpdateInboundShipmentDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'updateInboundShipment');
    },
    deleteInboundShipments(variables: DeleteInboundShipmentsMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<DeleteInboundShipmentsMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeleteInboundShipmentsMutation>(DeleteInboundShipmentsDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'deleteInboundShipments');
    },
    insertInboundShipment(variables: InsertInboundShipmentMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<InsertInboundShipmentMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<InsertInboundShipmentMutation>(InsertInboundShipmentDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'insertInboundShipment');
    },
    upsertInboundShipment(variables: UpsertInboundShipmentMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<UpsertInboundShipmentMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<UpsertInboundShipmentMutation>(UpsertInboundShipmentDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'upsertInboundShipment');
    },
    deleteInboundShipmentLines(variables: DeleteInboundShipmentLinesMutationVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<DeleteInboundShipmentLinesMutation> {
      return withWrapper((wrappedRequestHeaders) => client.request<DeleteInboundShipmentLinesMutation>(DeleteInboundShipmentLinesDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'deleteInboundShipmentLines');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInvoicesQuery((req, res, ctx) => {
 *   const { first, offset, key, desc, filter, storeId } = req.variables;
 *   return res(
 *     ctx.data({ invoices })
 *   )
 * })
 */
export const mockInvoicesQuery = (resolver: ResponseResolver<GraphQLRequest<InvoicesQueryVariables>, GraphQLContext<InvoicesQuery>, any>) =>
  graphql.query<InvoicesQuery, InvoicesQueryVariables>(
    'invoices',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInvoiceQuery((req, res, ctx) => {
 *   const { id, storeId } = req.variables;
 *   return res(
 *     ctx.data({ invoice })
 *   )
 * })
 */
export const mockInvoiceQuery = (resolver: ResponseResolver<GraphQLRequest<InvoiceQueryVariables>, GraphQLContext<InvoiceQuery>, any>) =>
  graphql.query<InvoiceQuery, InvoiceQueryVariables>(
    'invoice',
    resolver
  )

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

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockUpsertInboundShipmentMutation((req, res, ctx) => {
 *   const { input } = req.variables;
 *   return res(
 *     ctx.data({ batchInboundShipment })
 *   )
 * })
 */
export const mockUpsertInboundShipmentMutation = (resolver: ResponseResolver<GraphQLRequest<UpsertInboundShipmentMutationVariables>, GraphQLContext<UpsertInboundShipmentMutation>, any>) =>
  graphql.mutation<UpsertInboundShipmentMutation, UpsertInboundShipmentMutationVariables>(
    'upsertInboundShipment',
    resolver
  )

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockDeleteInboundShipmentLinesMutation((req, res, ctx) => {
 *   const { input } = req.variables;
 *   return res(
 *     ctx.data({ batchInboundShipment })
 *   )
 * })
 */
export const mockDeleteInboundShipmentLinesMutation = (resolver: ResponseResolver<GraphQLRequest<DeleteInboundShipmentLinesMutationVariables>, GraphQLContext<DeleteInboundShipmentLinesMutation>, any>) =>
  graphql.mutation<DeleteInboundShipmentLinesMutation, DeleteInboundShipmentLinesMutationVariables>(
    'deleteInboundShipmentLines',
    resolver
  )
