import { describe, expect, it } from 'vitest';
import { kindOf, statusDatetime, statusFlow } from './inboundShipmentStatus';

// The inbound-shipment status track's per-step dates
// (spec/inbound-shipments/rules.md § status lifecycle, § transfers;
// behaviour OMS-REG-REPL-03.23).

type Datetimes = Parameters<typeof statusDatetime>[0];

const datetimes = (over: Partial<Datetimes> = {}): Datetimes => ({
  createdDatetime: '2026-01-01T00:00:00Z',
  pickedDatetime: null,
  shippedDatetime: null,
  deliveredDatetime: null,
  receivedDatetime: null,
  verifiedDatetime: null,
  ...over,
});

describe('statusDatetime (REPL-03.23 — a date per reached step)', () => {
  it('reads each step from its own timestamp', () => {
    const info = datetimes({
      pickedDatetime: '2026-01-02T00:00:00Z',
      shippedDatetime: '2026-01-03T00:00:00Z',
      deliveredDatetime: '2026-01-04T00:00:00Z',
      receivedDatetime: '2026-01-05T00:00:00Z',
      verifiedDatetime: '2026-01-06T00:00:00Z',
    });
    expect(statusDatetime(info, 'NEW')).toBe('2026-01-01T00:00:00Z');
    expect(statusDatetime(info, 'PICKED')).toBe('2026-01-02T00:00:00Z');
    expect(statusDatetime(info, 'SHIPPED')).toBe('2026-01-03T00:00:00Z');
    expect(statusDatetime(info, 'DELIVERED')).toBe('2026-01-04T00:00:00Z');
    expect(statusDatetime(info, 'RECEIVED')).toBe('2026-01-05T00:00:00Z');
    expect(statusDatetime(info, 'VERIFIED')).toBe('2026-01-06T00:00:00Z');
  });

  // The transfer regression: the sending store's picked time arrives with the
  // shipment, so no step on a transfer's track is ever blank for want of it.
  it('leaves no step of a transfer track dateless', () => {
    const transfer = {
      inboundType: 'FROM_REQUISITION',
      linkedShipment: { id: 'outbound-1' },
    } as const;
    const info = datetimes({
      pickedDatetime: '2026-06-17T22:18:57Z',
      shippedDatetime: '2026-06-17T22:19:34Z',
      deliveredDatetime: '2026-06-17T22:21:20Z',
      receivedDatetime: '2026-06-17T22:22:00Z',
      verifiedDatetime: '2026-06-17T22:23:00Z',
    });
    const flow = statusFlow(kindOf(transfer), 'VERIFIED');
    expect(flow).toContain('PICKED');
    for (const status of flow)
      expect(statusDatetime(info, status)).toBeTruthy();
  });

  // Picked is never stamped locally, so a manual shipment has no picked time —
  // and no Picked step to show it on either.
  it('has no picked time, and no Picked step, on a manual shipment', () => {
    expect(statusDatetime(datetimes(), 'PICKED')).toBeNull();
    expect(
      statusFlow(kindOf({ inboundType: 'MANUAL_EXTERNAL' }), 'NEW')
    ).not.toContain('PICKED');
  });
});
