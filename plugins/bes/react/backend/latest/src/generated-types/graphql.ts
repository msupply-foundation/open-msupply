import * as Types from '../../codegenTypes';

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
        | { __typename: 'NodeError', error:
            | { __typename?: 'DatabaseError', description: string }
            | { __typename?: 'RecordNotFound', description: string }
           }
       }> | null, insertOutboundShipmentLines?: Array<{ __typename?: 'InsertOutboundShipmentLineResponseWithId', id: string, response:
        | { __typename: 'InsertOutboundShipmentLineError', error:
            | { __typename?: 'CannotEditInvoice', description: string }
            | { __typename?: 'ForeignKeyError', description: string }
            | { __typename?: 'LocationIsOnHold', description: string }
            | { __typename?: 'LocationNotFound', description: string }
            | { __typename?: 'NotEnoughStockForReduction', description: string }
            | { __typename?: 'StockLineAlreadyExistsInInvoice', description: string }
            | { __typename?: 'StockLineIsOnHold', description: string }
           }
        | { __typename: 'InvoiceLineNode', id: string, itemCode: string, numberOfPacks: number }
       }> | null, insertOutboundShipmentUnallocatedLines?: Array<{ __typename?: 'InsertOutboundShipmentUnallocatedLineResponseWithId', id: string, response:
        | { __typename: 'InsertOutboundShipmentUnallocatedLineError', error:
            | { __typename?: 'ForeignKeyError', description: string }
            | { __typename?: 'UnallocatedLineForItemAlreadyExists', description: string }
            | { __typename?: 'UnallocatedLinesOnlyEditableInNewInvoice', description: string }
           }
        | { __typename: 'InvoiceLineNode', id: string }
       }> | null, allocateOutboundShipmentUnallocatedLines?: Array<{ __typename?: 'AllocateOutboundShipmentUnallocatedLineResponseWithId', id: string, response:
        | { __typename: 'AllocateOutboundShipmentUnallocatedLineError', error: { __typename?: 'RecordNotFound', description: string } }
        | { __typename: 'AllocateOutboundShipmentUnallocatedLineNode', inserts: { __typename?: 'InvoiceLineConnector', nodes: Array<{ __typename?: 'InvoiceLineNode', id: string, numberOfPacks: number, stockLine?: { __typename?: 'StockLineNode', batch?: string | null } | null }> }, updates: { __typename?: 'InvoiceLineConnector', nodes: Array<{ __typename?: 'InvoiceLineNode', id: string }> } }
       }> | null, updateOutboundShipments?: Array<{ __typename?: 'UpdateOutboundShipmentResponseWithId', id: string, response:
        | { __typename: 'InvoiceNode' }
        | { __typename: 'NodeError', error:
            | { __typename?: 'DatabaseError', description: string }
            | { __typename?: 'RecordNotFound', description: string }
           }
        | { __typename: 'UpdateOutboundShipmentError', error:
            | { __typename?: 'CanOnlyChangeToAllocatedWhenNoUnallocatedLines', description: string }
            | { __typename?: 'CannotChangeStatusOfInvoiceOnHold', description: string }
            | { __typename?: 'CannotHaveEstimatedDeliveryDateBeforeShippedDate', description: string }
            | { __typename?: 'CannotIssueInForeignCurrency', description: string }
            | { __typename?: 'CannotReverseInvoiceStatus', description: string }
            | { __typename?: 'InvoiceIsNotEditable', description: string }
            | { __typename?: 'NotAnOutboundShipmentError', description: string }
            | { __typename?: 'RecordNotFound', description: string }
           }
       }> | null, deleteOutboundShipments?: Array<{ __typename?: 'DeleteOutboundShipmentResponseWithId', id: string, response:
        | { __typename: 'DeleteOutboundShipmentError', error:
            | { __typename?: 'CannotDeleteInvoiceWithLines', description: string }
            | { __typename?: 'CannotEditInvoice', description: string }
            | { __typename?: 'RecordNotFound', description: string }
           }
        | { __typename: 'DeleteResponse', id: string }
       }> | null } };

export type NamesQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  filter?: Types.InputMaybe<Types.NameFilterInput>;
}>;


export type NamesQuery = { __typename?: 'Queries', names: { __typename: 'NameConnector', nodes: Array<{ __typename?: 'NameNode', id: string, name: string, isCustomer: boolean }> } };

export type InsertOutbounndShipmentUnallocatedLineMutationVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  input: Types.InsertOutboundShipmentLineInput;
}>;


export type InsertOutbounndShipmentUnallocatedLineMutation = { __typename?: 'Mutations', insertOutboundShipmentUnallocatedLine:
    | { __typename: 'InsertOutboundShipmentUnallocatedLineError', error:
        | { __typename?: 'ForeignKeyError', description: string }
        | { __typename?: 'UnallocatedLineForItemAlreadyExists', description: string }
        | { __typename?: 'UnallocatedLinesOnlyEditableInNewInvoice', description: string }
       }
    | { __typename: 'InvoiceLineNode', id: string }
   };

export type ItemsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  filter?: Types.InputMaybe<Types.ItemFilterInput>;
}>;


export type ItemsQuery = { __typename?: 'Queries', items: { __typename: 'ItemConnector', totalCount: number, nodes: Array<{ __typename?: 'ItemNode', id: string, code: string, msupplyUniversalCode: string, name: string, availableStockOnHand: number, availableBatches: { __typename?: 'StockLineConnector', nodes: Array<{ __typename?: 'StockLineNode', id: string, expiryDate?: any | null, batch?: string | null, availableNumberOfPacks: number, packSize: number }> } }> } };
