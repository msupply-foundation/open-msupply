export enum InboundShipmentDetailTabs {
  Details = 'details',
  Financial = 'financial',
  Currency = 'currency',
  Delivery = 'delivery',
  Documents = 'documents',
  Log = 'log',
}

// This is what the Edit Modal receives when a scanned barcode is used (as
// opposed to the usual full "InboundLineItem" object)
export type ScannedItem = {
  id: string;
  batch?: string;
  expiryDate?: string;
};

// This is the data that is passed to the "CreateDraftInboundLine" function
// when creating the new line
export type ScannedBatchData = { batch?: string; expiryDate?: string };
