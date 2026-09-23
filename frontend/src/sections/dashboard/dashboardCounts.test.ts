import { describe, expect, it } from 'vitest';
import { buildSchema, parse, print, validate, Kind } from 'graphql';
import type { FieldNode, OperationDefinitionNode } from 'graphql';
// The pinned schema the contract names as the shape authority
// (schema.graphql).
import schemaSdl from '@/../schema.graphql?raw';
import {
  InboundShipmentCounts,
  InboundShipmentExternalCounts,
  ItemCounts,
  OutboundShipmentCounts,
  RequisitionCounts,
  StockCounts,
} from './dashboardCounts.generated';
import { PrescriptionRequestCounts } from './prescriptionRequestCounts.generated';

// The dashboard's whole wire surface (spec/dashboard/contract.md).
// Behaviours cited from spec/dashboard/cases/.

const DOCUMENTS = {
  InboundShipmentCounts,
  InboundShipmentExternalCounts,
  RequisitionCounts,
  OutboundShipmentCounts,
  StockCounts,
  ItemCounts,
  PrescriptionRequestCounts,
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

describe('the prescription counts (contract.md § the prescription counts)', () => {
  // Not a count query but the vertical's LIST read, so the shape is where this
  // one can go wrong: the two aliases must each ask for the count alone, and
  // the dispensed figure must window on the datetime rather than the status.
  const aliases = (): Record<string, FieldNode> => {
    const operation = parse(PrescriptionRequestCounts.query)
      .definitions[0] as OperationDefinitionNode;
    return Object.fromEntries(
      operation.selectionSet.selections
        .filter((node): node is FieldNode => node.kind === Kind.FIELD)
        .map(node => [node.alias?.value ?? node.name.value, node])
    );
  };

  it('validates against the pinned schema', () => {
    const errors = validate(
      buildSchema(schemaSdl),
      parse(PrescriptionRequestCounts.query)
    );
    expect(errors).toEqual([]);
  });

  it('reads both counts off one operation, two aliases on the list query', () => {
    // One operation because both aliases authorise against the same
    // permission: they share one failure unit, which is one panel.
    expect(Object.keys(aliases())).toEqual([
      'readyToDispense',
      'dispensedThisWeek',
    ]);
    for (const field of Object.values(aliases())) {
      expect(field.name.value).toBe('prescriptionRequests');
      const args = field.arguments?.map(a => print(a)).join(' ') ?? '';
      expect(args).toContain('storeId: $storeId');
      expect(args).toMatch(/page:\s*\{\s*first:\s*1\s*\}/);
      expect(print(field)).toContain('totalCount');
      expect(print(field)).not.toContain('nodes');
    }
  });

  it('OMS-REG-DB-01.63/.64: ready-to-dispense is a status, dispensed is a WINDOW', () => {
    // Asserted per alias, not over the document: `status` legitimately appears
    // on the other one.
    const ready = print(aliases().readyToDispense!);
    expect(ready).toContain('status: {equalTo: READY_TO_DISPENSE}');

    const dispensed = print(aliases().dispensedThisWeek!);
    expect(dispensed).toContain('dispensedDatetime: $dispensedDatetime');
    // Never a status window: a status advances, so the figure would fall as
    // records progress.
    expect(dispensed).not.toContain('status');
  });
});
