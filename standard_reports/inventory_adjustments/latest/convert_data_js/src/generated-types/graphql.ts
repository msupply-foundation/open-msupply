import * as Types from '../../codegenTypes';

export type InventoryAdjustmentsQueryVariables = Types.Exact<{
  storeId: Types.Scalars['String']['input'];
  adjustmentDateFrom?: Types.InputMaybe<Types.Scalars['DateTime']['input']>;
  adjustmentDateTo?: Types.InputMaybe<Types.Scalars['DateTime']['input']>;
}>;


export type InventoryAdjustmentsQuery = {
  __typename?: 'Queries',
  invoices: {
    __typename?: 'InvoiceConnector',
    nodes: Array<{
      __typename?: 'InvoiceNode',
      id: string,
      invoiceNumber: number,
      type: Types.InvoiceNodeType,
      verifiedDatetime?: string | null,
      lines: {
        __typename?: 'InvoiceLineConnector',
        nodes: Array<{
          __typename?: 'InvoiceLineNode',
          id: string,
          itemCode: string,
          itemName: string,
          batch?: string | null,
          expiryDate?: string | null,
          numberOfPacks: number,
          packSize: number,
          location?: {
            __typename?: 'LocationNode',
            id: string,
            code: string,
            name: string
          } | null,
          stockLine?: {
            __typename?: 'StockLineNode',
            id: string
          } | null,
          inventoryAdjustmentReason?: {
            __typename?: 'InventoryAdjustmentReasonNode',
            id: string,
            reason: string
          } | null,
          item: {
            __typename?: 'ItemNode',
            id: string,
            code: string,
            name: string,
            unitName?: string | null,
            masterLists?: Array<{
              __typename?: 'MasterListNode',
              id: string,
              name: string
            }> | null
          }
        }>
      }
    }>
  },
  stocktakes: {
    __typename?: 'StocktakeConnector',
    nodes: Array<{
      __typename?: 'StocktakeNode',
      id: string,
      stocktakeNumber: number,
      finalisedDatetime?: string | null,
      inventoryAdditionId?: string | null,
      inventoryReductionId?: string | null,
      lines: {
        __typename?: 'StocktakeLineConnector',
        nodes: Array<{
          __typename?: 'StocktakeLineNode',
          id: string,
          snapshotNumberOfPacks: number,
          countedNumberOfPacks?: number | null,
          stockLine?: {
            __typename?: 'StockLineNode',
            id: string
          } | null
        }>
      }
    }>
  },
  store: {
    __typename?: 'NodeError'
  } | {
    __typename?: 'StoreNode',
    id: string,
    code: string,
    storeName: string,
    logo?: string | null,
    name: {
      __typename?: 'NameNode',
      address1?: string | null,
      address2?: string | null,
      code: string,
      email?: string | null,
      phone?: string | null
    }
  }
};
