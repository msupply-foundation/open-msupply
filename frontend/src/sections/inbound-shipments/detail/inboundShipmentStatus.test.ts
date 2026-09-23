import { describe, expect, it } from 'vitest';
import {
  currentStep,
  filterByStatusPreference,
} from '@/domain/invoice/statusGate';
import {
  canChangeStatus,
  isEditable,
  actionsLocked,
  reachableStatuses,
  sourceLinkOf,
  statusDatetime,
  statusFlow,
  type SourceLink,
} from './inboundShipmentStatus';

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

// Every (origin, linked-shipment) pair the wire can present, and the source
// link each one reads as. Exhaustive on purpose: this classification is the
// single input to the status track, the split button, the kind banner, the
// supplier lock and the transport panel, so one wrong row moves all five at
// once. Enumerating the whole cross-product also makes an added origin fail
// here rather than silently fall through to a default.
const ORIGINS = [
  'FROM_REQUISITION',
  'FROM_PURCHASE_ORDER',
  'MANUAL_INTERNAL',
  'MANUAL_EXTERNAL',
] as const;

const CLASSIFICATION: Record<
  (typeof ORIGINS)[number],
  { unlinked: SourceLink; linked: SourceLink }
> = {
  // A requisition link alone is NOT a source link — the internal order says
  // what was asked for, nothing is sending against it. The server agrees: it
  // refuses Shipped on "no purchase order and no linked shipment" (issue
  // #1132, the case this whole classification got wrong).
  FROM_REQUISITION: { unlinked: 'none', linked: 'transfer' },
  // A purchase order wins over a linked shipment. Unreachable through
  // oMS's own writes — the transfer processor stamps purchase_order_id: None
  // — but sync from legacy mSupply translates both links independently, so the
  // pair is decidable rather than impossible, and the precedence is pinned
  // here to match the current app's.
  FROM_PURCHASE_ORDER: { unlinked: 'purchaseOrder', linked: 'purchaseOrder' },
  // Either manual origin: unlinked until the transfer processor links it.
  MANUAL_INTERNAL: { unlinked: 'none', linked: 'transfer' },
  MANUAL_EXTERNAL: { unlinked: 'none', linked: 'transfer' },
};

describe('sourceLinkOf (REPL-03.10 / .11 / .12 — which shipments reach Picked and Shipped)', () => {
  for (const origin of ORIGINS) {
    const expected = CLASSIFICATION[origin];

    it(`reads ${origin} with no linked shipment as '${expected.unlinked}'`, () => {
      expect(sourceLinkOf({ inboundType: origin })).toBe(expected.unlinked);
      // null and undefined are the same absence on the wire.
      expect(sourceLinkOf({ inboundType: origin, linkedShipment: null })).toBe(
        expected.unlinked
      );
    });

    it(`reads ${origin} with a linked shipment as '${expected.linked}'`, () => {
      expect(
        sourceLinkOf({
          inboundType: origin,
          linkedShipment: { id: 'outbound-1' },
        })
      ).toBe(expected.linked);
    });
  }
});

// .10/.11: Picked and Shipped appear only where they are reachable — and .12:
// the split button never OFFERS a Shipped the server would refuse. Asserted per
// source link, so the two are pinned together for every shipment class.
describe('status flow per source link (REPL-03.10 / .11 / .12)', () => {
  it('gives an unlinked shipment no Picked and no Shipped', () => {
    expect(statusFlow('none', 'NEW')).toEqual([
      'NEW',
      'DELIVERED',
      'RECEIVED',
      'VERIFIED',
    ]);
    expect(reachableStatuses('none', 'NEW')).toEqual([
      'DELIVERED',
      'RECEIVED',
      'VERIFIED',
    ]);
  });

  it('gives a PO-linked shipment Shipped but never Picked', () => {
    expect(statusFlow('purchaseOrder', 'NEW')).toEqual([
      'NEW',
      'SHIPPED',
      'DELIVERED',
      'RECEIVED',
      'VERIFIED',
    ]);
    expect(reachableStatuses('purchaseOrder', 'NEW')).toContain('SHIPPED');
  });

  // Picked is on a transfer's track (the sender stamped it) but is never
  // offered as an advance — only the transfer processor sets it.
  it('shows Picked on a transfer track without offering it', () => {
    expect(statusFlow('transfer', 'NEW')).toEqual([
      'NEW',
      'PICKED',
      'SHIPPED',
      'DELIVERED',
      'RECEIVED',
      'VERIFIED',
    ]);
    expect(reachableStatuses('transfer', 'NEW')).not.toContain('PICKED');
  });

  // The manual+internal-order regression in full: the shipment the issue was
  // filed about must offer Delivered, not Shipped.
  it('offers Delivered, not Shipped, on an internal-order-linked shipment', () => {
    const link = sourceLinkOf({
      inboundType: 'FROM_REQUISITION',
      linkedShipment: null,
    });
    expect(reachableStatuses(link, 'NEW')[0]).toBe('DELIVERED');
    expect(reachableStatuses(link, 'NEW')).not.toContain('SHIPPED');
  });
});

describe('isEditable', () => {
  it('takes edits only at New, Delivered and Received', () => {
    expect(isEditable('NEW')).toBe(true);
    expect(isEditable('DELIVERED')).toBe(true);
    expect(isEditable('RECEIVED')).toBe(true);
  });

  // Picked is the transfer processor's window and Verified is terminal — both
  // also rejected by the server's own check_invoice_is_editable.
  it('is read-only at Picked and Verified', () => {
    expect(isEditable('PICKED')).toBe(false);
    expect(isEditable('VERIFIED')).toBe(false);
  });

  // The server accepts edits here; we do not (rules.md § Editability).
  it('is read-only at Shipped, where the server is looser', () => {
    expect(isEditable('SHIPPED')).toBe(false);
  });

  it('treats an unknown status as read-only', () => {
    expect(isEditable('')).toBe(false);
    expect(isEditable('CANCELLED')).toBe(false);
  });

});

// Issue #873 / REPL-09 .25: Received closes a PO-linked shipment's
// line-selection actions while the shipment itself stays editable (its lines
// still open, and items are still added).
describe('actionsLocked', () => {
  it('locks a PO-linked shipment from Received', () => {
    expect(actionsLocked('NEW', true)).toBe(false);
    expect(actionsLocked('SHIPPED', true)).toBe(false);
    expect(actionsLocked('DELIVERED', true)).toBe(false);
    expect(actionsLocked('RECEIVED', true)).toBe(true);
    expect(actionsLocked('VERIFIED', true)).toBe(true);
    expect(isEditable('RECEIVED')).toBe(true);
  });

  it('never locks a shipment without a purchase order', () => {
    expect(actionsLocked('RECEIVED', false)).toBe(false);
    expect(actionsLocked('VERIFIED', false)).toBe(false);
  });
});

describe('canChangeStatus', () => {
  // The gate that keeps the Shipped edit lock from stranding a shipment: the
  // advance to Delivered has to remain reachable.
  it('still offers an advance at Shipped, where edits are locked', () => {
    expect(isEditable('SHIPPED')).toBe(false);
    expect(canChangeStatus('SHIPPED')).toBe(true);
  });

  // Likewise a PO-linked shipment with closed actions still reaches Verified.
  it('still offers the advance to Verified on a PO-linked Received shipment', () => {
    expect(actionsLocked('RECEIVED', true)).toBe(true);
    expect(canChangeStatus('RECEIVED')).toBe(true);
  });

  it('closes only at Verified', () => {
    expect(canChangeStatus('NEW')).toBe(true);
    expect(canChangeStatus('PICKED')).toBe(true);
    expect(canChangeStatus('DELIVERED')).toBe(true);
    expect(canChangeStatus('RECEIVED')).toBe(true);
    expect(canChangeStatus('VERIFIED')).toBe(false);
  });
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
    const flow = statusFlow(sourceLinkOf(transfer), 'VERIFIED');
    expect(flow).toContain('PICKED');
    for (const status of flow)
      expect(statusDatetime(info, status)).toBeTruthy();
  });

  // Picked is never stamped locally, so a manual shipment has no picked time —
  // and no Picked step to show it on either.
  it('has no picked time, and no Picked step, on a manual shipment', () => {
    expect(statusDatetime(datetimes(), 'PICKED')).toBeNull();
    expect(
      statusFlow(sourceLinkOf({ inboundType: 'MANUAL_EXTERNAL' }), 'NEW')
    ).not.toContain('PICKED');
  });
});

// The invoice-status-options display gate (spec § preference gates;
// behaviours OMS-REG-REPL-01.28, OMS-REG-REPL-03.25/.26), applied through the
// shared @/domain/invoice helpers exactly as the status footer composes them:
// the offered track is the kind's flow narrowed by the preference.
const offeredFlow = (
  kind: Parameters<typeof statusFlow>[0],
  current: string,
  allowed: readonly string[]
) => filterByStatusPreference(statusFlow(kind, current), allowed);

describe('offered flow (OMS-REG-REPL-03.25 — the track offers only preference-allowed stages)', () => {
  it('offers the kind’s full flow while the preference is empty / not yet loaded', () => {
    expect(offeredFlow('none', 'NEW', [])).toEqual([
      'NEW',
      'DELIVERED',
      'RECEIVED',
      'VERIFIED',
    ]);
  });

  it('drops the stages the preference excludes, keeping flow order', () => {
    expect(offeredFlow('none', 'NEW', ['NEW', 'RECEIVED', 'VERIFIED'])).toEqual(
      ['NEW', 'RECEIVED', 'VERIFIED']
    );
  });

  it('narrows a transfer’s track the same way (Picked ships with group one)', () => {
    expect(
      offeredFlow('transfer', 'NEW', [
        'NEW',
        'SHIPPED',
        'DELIVERED',
        'RECEIVED',
        'VERIFIED',
      ])
    ).toEqual(['NEW', 'SHIPPED', 'DELIVERED', 'RECEIVED', 'VERIFIED']);
  });
});

describe('currentStep (OMS-REG-REPL-03.26 — an excluded current status marks the nearest included earlier stage)', () => {
  const allowed = ['NEW', 'RECEIVED', 'VERIFIED'];
  const step = (status: string, allowedList: readonly string[]) =>
    currentStep(
      statusFlow('none', status),
      offeredFlow('none', status, allowedList),
      status
    );

  it('marks the current status itself when the preference includes it', () => {
    expect(step('RECEIVED', allowed)).toBe(1);
  });

  it('marks the nearest included earlier stage when the current one is excluded', () => {
    // DELIVERED is excluded → NEW (step 0) lights up.
    expect(step('DELIVERED', allowed)).toBe(0);
  });

  it('tracks the plain flow index while the preference is unrestrictive', () => {
    expect(step('DELIVERED', [])).toBe(1);
  });
});

describe('filterByStatusPreference (OMS-REG-REPL-03.25 — advance choices limited)', () => {
  it('passes every target through while the preference is empty', () => {
    expect(
      filterByStatusPreference(['DELIVERED', 'RECEIVED', 'VERIFIED'], [])
    ).toEqual(['DELIVERED', 'RECEIVED', 'VERIFIED']);
  });

  it('drops the targets the preference excludes', () => {
    expect(
      filterByStatusPreference(
        ['DELIVERED', 'RECEIVED', 'VERIFIED'],
        ['NEW', 'RECEIVED', 'VERIFIED']
      )
    ).toEqual(['RECEIVED', 'VERIFIED']);
  });
});
