import * as Types from '../../codegenTypes';

export type AllocateBatchOutboundShipmentMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.BatchOutboundShipmentInput;
}>;


export type AllocateBatchOutboundShipmentMutation = { __typename?: 'Mutations', batchOutboundShipment: { __typename?: 'BatchOutboundShipmentResponse', allocateOutboundShipmentUnallocatedLines?: Array<{ __typename?: 'AllocateOutboundShipmentUnallocatedLineResponseWithId', id: string, response:
        | { __typename: 'AllocateOutboundShipmentUnallocatedLineError', error: { __typename?: 'RecordNotFound', description: string } }
        | { __typename: 'AllocateOutboundShipmentUnallocatedLineNode', inserts: { __typename?: 'InvoiceLineConnector', nodes: Array<{ __typename?: 'InvoiceLineNode', id: string, numberOfPacks: number, stockLine?: { __typename?: 'StockLineNode', batch?: string | null } | null }> }, updates: { __typename?: 'InvoiceLineConnector', nodes: Array<{ __typename?: 'InvoiceLineNode', id: string }> } }
       }> | null } };

export type BatchOutboundShipmentMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.BatchOutboundShipmentInput;
}>;


export type BatchOutboundShipmentMutation = { __typename?: 'Mutations', batchOutboundShipment: { __typename?: 'BatchOutboundShipmentResponse', insertOutboundShipments?: Array<{ __typename?: 'InsertOutboundShipmentResponseWithId', id: string, response:
        | { __typename: 'InsertOutboundShipmentError', error:
            | { __typename?: 'OtherPartyNotACustomer', description: string }
            | { __typename?: 'OtherPartyNotVisible', description: string }
           }
        | { __typename: 'InvoiceNode', id: string, invoiceNumber: number }
        | { __typename: 'NodeError' }
       }> | null, insertOutboundShipmentUnallocatedLines?: Array<{ __typename?: 'InsertOutboundShipmentUnallocatedLineResponseWithId', id: string, response:
        | { __typename: 'InsertOutboundShipmentUnallocatedLineError', error:
            | { __typename?: 'ForeignKeyError', description: string }
            | { __typename?: 'UnallocatedLineForItemAlreadyExists', description: string }
            | { __typename?: 'UnallocatedLinesOnlyEditableInNewInvoice', description: string }
           }
        | { __typename: 'InvoiceLineNode', id: string }
       }> | null } };

export type NamesQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  filter?: Types.InputMaybe<Types.NameFilterInput>;
}>;


export type NamesQuery = { __typename?: 'Queries', names: { __typename: 'NameConnector', nodes: Array<{ __typename?: 'NameNode', id: string, name: string, isCustomer: boolean }> } };

export type ItemsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  filter?: Types.InputMaybe<Types.ItemFilterInput>;
}>;


export type ItemsQuery = { __typename?: 'Queries', items: { __typename: 'ItemConnector', totalCount: number, nodes: Array<{ __typename?: 'ItemNode', id: string, code: string, name: string, availableStockOnHand: number, stats: { __typename?: 'ItemStatsNode', availableStockOnHand: number, averageMonthlyConsumption: number } }> } };
