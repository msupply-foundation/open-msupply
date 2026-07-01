/*
 * Mock outbound-shipment data for the Table showcase.
 *
 * The row shape is a faithful subset of the real GraphQL `InvoiceNode` list
 * fragment (client/packages/invoices/src/OutboundShipment/api/operations.graphql
 * → `fragment Outbound on InvoiceNode`). Field names and nesting match the real
 * schema, so wiring this table to a live GraphQL call later is a data-source
 * swap — the column accessors keep working unchanged.
 *
 * Generation is DETERMINISTIC (seeded PRNG, no Math.random) so the same rows
 * appear on every reload — important for a stable performance benchmark.
 */

/** The outbound-relevant slice of the real `InvoiceNodeStatus` enum. */
export type InvoiceNodeStatus =
  | 'NEW'
  | 'ALLOCATED'
  | 'PICKED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'VERIFIED';

/** Mirrors the fields the outbound list column set reads from `InvoiceNode`. */
export interface OutboundShipmentRow {
  id: string;
  invoiceNumber: number;
  otherPartyName: string;
  status: InvoiceNodeStatus;
  createdDatetime: string; // ISO 8601
  theirReference: string | null;
  comment: string | null;
  colour: string | null; // the name colour-dot; null → default grey
  pricing: { totalAfterTax: number }; // nested, so the accessor path is real
}

/** Display label + chip colour per status (colours are demo values). */
export const STATUS_META: Record<
  InvoiceNodeStatus,
  { label: string; colour: string }
> = {
  NEW: { label: 'New', colour: '#8f90a6' },
  ALLOCATED: { label: 'Allocated', colour: '#3e7bfa' },
  PICKED: { label: 'Picked', colour: '#f2a001' },
  SHIPPED: { label: 'Shipped', colour: '#1fb6b6' },
  DELIVERED: { label: 'Delivered', colour: '#7c5cff' },
  VERIFIED: { label: 'Verified', colour: '#38a169' },
};

/**
 * Shipped shipments are read-only in the real app (`isOutboundDisabled`), which
 * the table greys out. Kept as a helper so the rule lives in one place.
 */
export const isRestricted = (row: OutboundShipmentRow) =>
  row.status === 'SHIPPED' || row.status === 'VERIFIED';

/* --- deterministic generation ---------------------------------------- */

// mulberry32 — tiny, fast, seeded PRNG. Same seed → same sequence.
const rng = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const CUSTOMERS = [
  'Slytherin Clinic',
  'Android Store',
  'Ravenclaw Health Post',
  'Tamaki Regional Hospital',
  'Gryffindor Dispensary',
  'Central Medical Stores',
  'Hufflepuff Community Clinic',
  'Northern District Warehouse',
  'Riverside Health Centre',
  'Coastal Referral Hospital',
  'Highland Rural Clinic',
  'Mercy Mission Pharmacy',
  'Unity Health Facility',
  'Sunrise District Hospital',
  'Lakeview Medical Centre',
];

const REFERENCES = [
  'From internal order 3',
  'From internal order 4',
  'HILO',
  'ONE',
  'TEST',
  'PO-2291',
  'REQ-8841',
  null,
  null,
  null,
];

const COMMENTS = [
  'Urgent — cold-chain items included',
  'Partial fulfilment, backorder to follow',
  'Customer requested delivery before month end',
  'Adjusted quantities after stock count',
  null,
  null,
  null,
  null,
  null,
  null,
];

// A few named colours mirroring the app's name colour-dot palette; mostly null.
const COLOURS = [null, null, null, null, null, '#e63535', '#3e7bfa', '#38a169'];

const STATUSES: InvoiceNodeStatus[] = [
  'NEW',
  'ALLOCATED',
  'PICKED',
  'SHIPPED',
  'DELIVERED',
  'VERIFIED',
];

/**
 * Build `n` outbound-shipment rows. Deterministic for a given `n`. Crank `n`
 * into the thousands for the virtualisation / row-count benchmark.
 */
export const makeOutboundShipments = (n = 400): OutboundShipmentRow[] => {
  const rand = rng(0x5eed);
  const pick = <T>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
  const base = Date.UTC(2025, 0, 1); // 2025-01-01
  const day = 86_400_000;

  return Array.from({ length: n }, (_, i) => {
    const number = n - i; // newest (highest number) first, like the real list
    // Spread creation dates backwards from ~now, newest at the top.
    const createdDatetime = new Date(
      base + (n - i) * day * 1.5 - Math.floor(rand() * day)
    ).toISOString();

    return {
      id: `os-${number}`,
      invoiceNumber: number,
      otherPartyName: pick(CUSTOMERS),
      status: pick(STATUSES),
      createdDatetime,
      theirReference: pick(REFERENCES),
      comment: pick(COMMENTS),
      colour: pick(COLOURS),
      pricing: {
        totalAfterTax: Math.round(rand() * 480_000) / 100, // 0 – 4,800.00
      },
    };
  });
};
