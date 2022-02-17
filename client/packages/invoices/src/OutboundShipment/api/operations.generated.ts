import * as Types from '../../../../common/src/types/schema';

import { GraphQLClient } from 'graphql-request';
import * as Dom from 'graphql-request/dist/types.dom';
import gql from 'graphql-tag';
import { graphql, ResponseResolver, GraphQLRequest, GraphQLContext } from 'msw'
export type ItemFragment = { __typename?: 'ItemNode', id: string, code: string, name: string };

export type InvoiceQueryVariables = Types.Exact<{
  id: Types.Scalars['String'];
}>;


export type InvoiceQuery = { __typename?: 'Queries', invoice: { __typename: 'InvoiceNode', id: string, comment?: string | null, createdDatetime: string, allocatedDatetime?: string | null, deliveredDatetime?: string | null, pickedDatetime?: string | null, shippedDatetime?: string | null, verifiedDatetime?: string | null, invoiceNumber: number, colour?: string | null, onHold: boolean, otherPartyId: string, otherPartyName: string, status: Types.InvoiceNodeStatus, theirReference?: string | null, type: Types.InvoiceNodeType, otherParty: { __typename: 'NameNode', id: string, name: string, code: string, isCustomer: boolean, isSupplier: boolean } | { __typename: 'NodeError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'RecordNotFound', description: string } }, lines: { __typename: 'ConnectorError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename?: 'PaginationError', description: string } } | { __typename: 'InvoiceLineConnector', totalCount: number, nodes: Array<{ __typename: 'InvoiceLineNode', type: Types.InvoiceLineNodeType, batch?: string | null, costPricePerPack: number, expiryDate?: string | null, id: string, itemCode: string, itemId: string, itemName: string, numberOfPacks: number, packSize: number, note?: string | null, invoiceId: string, locationName?: string | null, sellPricePerPack: number, location?: { __typename: 'LocationNode', id: string, name: string, code: string, onHold: boolean, stock: { __typename: 'ConnectorError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename?: 'PaginationError', description: string } } | { __typename: 'StockLineConnector', totalCount: number, nodes: Array<{ __typename?: 'StockLineNode', id: string, costPricePerPack: number, itemId: string, availableNumberOfPacks: number, onHold: boolean, packSize: number, sellPricePerPack: number, storeId: string, totalNumberOfPacks: number }> } } | { __typename: 'NodeError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'RecordNotFound', description: string } } | null, item: { __typename: 'ItemError', error: { __typename: 'InternalError', description: string, fullError: string } } | { __typename: 'ItemNode', id: string, name: string, code: string, isVisible: boolean, unitName?: string | null, availableBatches: { __typename: 'ConnectorError', error: { __typename?: 'DatabaseError', description: string } | { __typename?: 'PaginationError', description: string } } | { __typename?: 'StockLineConnector', totalCount: number, nodes: Array<{ __typename?: 'StockLineNode', id: string, availableNumberOfPacks: number, costPricePerPack: number, itemId: string, onHold: boolean, packSize: number, sellPricePerPack: number, storeId: string, totalNumberOfPacks: number, expiryDate?: string | null }> } }, stockLine?: { __typename: 'NodeError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'RecordNotFound', description: string } } | { __typename: 'StockLineNode', availableNumberOfPacks: number, batch?: string | null, costPricePerPack: number, expiryDate?: string | null, id: string, itemId: string, packSize: number, sellPricePerPack: number, storeId: string, totalNumberOfPacks: number, onHold: boolean, note?: string | null } | null }> }, pricing: { __typename: 'InvoicePricingNode', totalAfterTax: number, totalBeforeTax: number, stockTotalBeforeTax: number, stockTotalAfterTax: number, serviceTotalAfterTax: number, serviceTotalBeforeTax: number } | { __typename: 'NodeError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'RecordNotFound', description: string } } } | { __typename: 'NodeError', error: { __typename: 'DatabaseError', description: string, fullError: string } | { __typename: 'RecordNotFound', description: string } } };

export const ItemFragmentDoc = gql`
    fragment Item on ItemNode {
  id
  code
  name
}
    `;
export const InvoiceDocument = gql`
    query invoice($id: String!) {
  invoice(id: $id) {
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
                availableBatches {
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

export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {
    invoice(variables: InvoiceQueryVariables, requestHeaders?: Dom.RequestInit["headers"]): Promise<InvoiceQuery> {
      return withWrapper((wrappedRequestHeaders) => client.request<InvoiceQuery>(InvoiceDocument, variables, {...requestHeaders, ...wrappedRequestHeaders}), 'invoice');
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;

/**
 * @param resolver a function that accepts a captured request and may return a mocked response.
 * @see https://mswjs.io/docs/basics/response-resolver
 * @example
 * mockInvoiceQuery((req, res, ctx) => {
 *   const { id } = req.variables;
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
