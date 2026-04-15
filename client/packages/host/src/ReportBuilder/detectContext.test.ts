import { detectContext } from './detectContext';

describe('detectContext', () => {
  it('returns null for empty string', () => {
    expect(detectContext('')).toBeNull();
  });

  it('returns null for whitespace', () => {
    expect(detectContext('   ')).toBeNull();
  });

  it('returns null for unrelated query', () => {
    expect(detectContext('query { me { id } }')).toBeNull();
  });

  it('detects REQUISITION', () => {
    expect(detectContext('query { requisition(id: "x") { id } }')).toBe(
      'REQUISITION'
    );
  });

  it('detects STOCKTAKE', () => {
    expect(detectContext('query { stocktake(id: "x") { id } }')).toBe(
      'STOCKTAKE'
    );
  });

  it('detects PURCHASE_ORDER', () => {
    expect(detectContext('query { purchaseOrder(id: "x") { id } }')).toBe(
      'PURCHASE_ORDER'
    );
  });

  it('detects INBOUND_SHIPMENT via underscore variant', () => {
    expect(
      detectContext('query { inbound_shipment(id: "x") { id } }')
    ).toBe('INBOUND_SHIPMENT');
  });

  it('detects INBOUND_SHIPMENT via camelCase variant', () => {
    expect(
      detectContext('query { inboundShipment(id: "x") { id } }')
    ).toBe('INBOUND_SHIPMENT');
  });

  it('detects OUTBOUND_SHIPMENT via underscore variant', () => {
    expect(
      detectContext('query { outbound_shipment(id: "x") { id } }')
    ).toBe('OUTBOUND_SHIPMENT');
  });

  it('detects OUTBOUND_SHIPMENT via camelCase variant', () => {
    expect(
      detectContext('query { outboundShipment(id: "x") { id } }')
    ).toBe('OUTBOUND_SHIPMENT');
  });

  it('detects PRESCRIPTION', () => {
    expect(detectContext('query { prescription { id } }')).toBe(
      'PRESCRIPTION'
    );
  });

  it('detects CUSTOMER_RETURN via underscore variant', () => {
    expect(
      detectContext('query { customer_return(id: "x") { id } }')
    ).toBe('CUSTOMER_RETURN');
  });

  it('detects CUSTOMER_RETURN via camelCase variant', () => {
    expect(
      detectContext('query { customerReturn(id: "x") { id } }')
    ).toBe('CUSTOMER_RETURN');
  });

  it('detects SUPPLIER_RETURN via underscore variant', () => {
    expect(
      detectContext('query { supplier_return(id: "x") { id } }')
    ).toBe('SUPPLIER_RETURN');
  });

  it('detects SUPPLIER_RETURN via camelCase variant', () => {
    expect(
      detectContext('query { supplierReturn(id: "x") { id } }')
    ).toBe('SUPPLIER_RETURN');
  });

  it('detects OUTBOUND_SHIPMENT from bare invoice( fallback', () => {
    // When a query uses invoice( but no more specific keyword matches,
    // the function maps it to OUTBOUND_SHIPMENT as a fallback.
    expect(detectContext('query { invoice(id: "x") { id } }')).toBe(
      'OUTBOUND_SHIPMENT'
    );
  });

  it('is case-insensitive', () => {
    expect(detectContext('query { REQUISITION(id: "x") { id } }')).toBe(
      'REQUISITION'
    );
    expect(
      detectContext('query { INBOUND_SHIPMENT(id: "x") { id } }')
    ).toBe('INBOUND_SHIPMENT');
  });
});
