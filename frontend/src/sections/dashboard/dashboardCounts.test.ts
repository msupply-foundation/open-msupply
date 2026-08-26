import { describe, expect, it } from 'vitest';
import {
  InboundShipmentCounts,
  InboundShipmentExternalCounts,
  ItemCounts,
  OutboundShipmentCounts,
  RequisitionCounts,
  StockCounts,
} from './dashboardCounts.generated';

// The dashboard's whole wire surface (spec/dashboard/contract.md).
// Behaviours cited from spec/dashboard/cases/.

const DOCUMENTS = {
  InboundShipmentCounts,
  InboundShipmentExternalCounts,
  RequisitionCounts,
  OutboundShipmentCounts,
  StockCounts,
  ItemCounts,
};

describe('dashboard wire surface', () => {
  // OMS-REG-DB-01.21/.24 — read-only and store-scoped: the vertical issues only
  // count queries (no mutations), every one carrying the required storeId.
  it('OMS-REG-DB-01.21/.24: every operation is a query and requires storeId', () => {
    for (const doc of Object.values(DOCUMENTS)) {
      expect(doc.query.trimStart().startsWith('query ')).toBe(true);
      expect(doc.query).toContain('$storeId: String!');
      expect(doc.query).not.toContain('mutation');
    }
  });

  // contract.md § time windows — the app omits timezoneOffset everywhere
  // (server-local bucketing, the documented wire behaviour).
  it('omits timezoneOffset on every count query', () => {
    for (const doc of Object.values(DOCUMENTS)) {
      expect(doc.query).not.toContain('timezoneOffset');
    }
  });

  // contract.md § deprecated combined query — new work must use the three split
  // invoice-count queries, never invoiceCounts.
  it('never uses the deprecated invoiceCounts query', () => {
    for (const doc of Object.values(DOCUMENTS)) {
      expect(doc.query).not.toMatch(/\binvoiceCounts\s*\(/);
    }
  });

  // contract.md § stock levels — the threshold arguments are declared so the
  // app can always send them explicitly (OMS-REG-DB-01.54); stockCounts
  // declares daysTillExpired for the same reason (OMS-REG-DB-01.46).
  it('OMS-REG-DB-01.54/.46: declares the explicit threshold arguments', () => {
    expect(ItemCounts.query).toContain('$lowStockThreshold: Float');
    expect(ItemCounts.query).toContain('$highStockThreshold: Float');
    expect(StockCounts.query).toContain('$daysTillExpired: Int');
  });
});
