export type DetectedContext =
  | 'REQUISITION'
  | 'INBOUND_SHIPMENT'
  | 'OUTBOUND_SHIPMENT'
  | 'PRESCRIPTION'
  | 'STOCKTAKE'
  | 'PURCHASE_ORDER'
  | 'CUSTOMER_RETURN'
  | 'SUPPLIER_RETURN'
  | 'INTERNAL_ORDER'
  | null;

export const detectContext = (query: string): DetectedContext => {
  if (!query) return null;
  const q = query.toLowerCase();
  if (q.includes('requisition(')) return 'REQUISITION';
  if (q.includes('stocktake(')) return 'STOCKTAKE';
  if (q.includes('purchaseorder(')) return 'PURCHASE_ORDER';
  if (q.includes('inbound_shipment') || q.includes('inboundshipment'))
    return 'INBOUND_SHIPMENT';
  if (q.includes('outbound_shipment') || q.includes('outboundshipment'))
    return 'OUTBOUND_SHIPMENT';
  if (q.includes('prescription')) return 'PRESCRIPTION';
  if (q.includes('customer_return') || q.includes('customerreturn'))
    return 'CUSTOMER_RETURN';
  if (q.includes('supplier_return') || q.includes('supplierreturn'))
    return 'SUPPLIER_RETURN';
  if (q.includes('invoice(')) return 'OUTBOUND_SHIPMENT';
  return null;
};
