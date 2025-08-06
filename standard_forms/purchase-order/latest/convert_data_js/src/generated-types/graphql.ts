import * as Types from '../../codegenTypes';

export type PurchaseOrderQueryVariables = Types.Exact<{
  dataId: Types.Scalars['String']['input'];
  storeId: Types.Scalars['String']['input'];
}>;


export type PurchaseOrderQuery = {
  __typename?: 'Queries',
  purchaseOrder: {
    __typename?: 'PurchaseOrderNode',
    id: string,
    number: number,
    foreignExchangeRate?: number | null,
    status: Types.PurchaseOrderNodeStatus,
    confirmedDatetime?: string | null,
    store?: {
      __typename?: 'StoreNode',
      storeName: string,
      logo?: string | null,
      name: {
        __typename?: 'NameNode',
        address1?: string | null,
        address2?: string | null,
        phone?: string | null,
        email?: string | null
      }
    } | null,
    supplier?: {
      __typename?: 'NameNode',
      name: string,
      code: string,
      address1?: string | null,
      address2?: string | null
    } | null,
    lines: {
      __typename?: 'PurchaseOrderLineConnector',
      nodes: Array<{
        __typename?: 'PurchaseOrderLineNode',
        lineNumber: number,
        expectedDeliveryDate?: string | null,
        requestedNumberOfUnits: number,
        requestedPackSize: number,
        pricePerUnitAfterDiscount: number,
        pricePerUnitBeforeDiscount: number,
        supplierItemCode?: string | null,
        comment?: string | null,
        item: {
          __typename?: 'ItemNode',
          code: string,
          name: string,
          unitName?: string | null
        }
      }>
    }
  } | {
    __typename?: 'RecordNotFound'
  }
};
