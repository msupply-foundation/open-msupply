import { describe, expect, it } from 'vitest';
import {
  currentStep,
  filterByStatusPreference,
} from '@/domain/invoice/statusGate';
import {
  canChangeStatus,
  isEditable,
  kindOf,
  statusDatetime,
  statusFlow,
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

describe('canChangeStatus', () => {
  // The gate that keeps the Shipped edit lock from stranding a shipment: the
  // advance to Delivered has to remain reachable.
  it('still offers an advance at Shipped, where edits are locked', () => {
    expect(isEditable('SHIPPED')).toBe(false);
    expect(canChangeStatus('SHIPPED')).toBe(true);
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
    expect(offeredFlow('manual', 'NEW', [])).toEqual([
      'NEW',
      'DELIVERED',
      'RECEIVED',
      'VERIFIED',
    ]);
  });

  it('drops the stages the preference excludes, keeping flow order', () => {
    expect(
      offeredFlow('manual', 'NEW', ['NEW', 'RECEIVED', 'VERIFIED'])
    ).toEqual(['NEW', 'RECEIVED', 'VERIFIED']);
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
      statusFlow('manual', status),
      offeredFlow('manual', status, allowedList),
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
