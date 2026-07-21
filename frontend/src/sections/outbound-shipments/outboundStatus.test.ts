import { describe, expect, it } from 'vitest';
import {
  CLIENT_SETTABLE,
  STATUS_FLOW,
  isDeletable,
  isEditable,
  statusColour,
  statusLabel,
  statusIndex,
} from './outboundStatus';

// The status lifecycle helpers (spec/outbound-shipments rules.md § status
// lifecycle / editability / deletion). Criteria cited from
// spec/outbound-shipments/acceptance.md.

describe('outboundStatus', () => {
  it('orders the full lifecycle NEW → VERIFIED', () => {
    expect([...STATUS_FLOW]).toEqual([
      'NEW',
      'ALLOCATED',
      'PICKED',
      'SHIPPED',
      'DELIVERED',
      'RECEIVED',
      'VERIFIED',
    ]);
    expect(statusIndex('NEW')).toBe(0);
    expect(statusIndex('VERIFIED')).toBe(6);
    expect(statusIndex('CANCELLED')).toBe(-1);
  });

  // AC-S4 — SHIPPED is read-only: every edit affordance keys off this gate.
  it('AC-S4: editable while NEW/ALLOCATED/PICKED, read-only from SHIPPED', () => {
    expect(isEditable('NEW')).toBe(true);
    expect(isEditable('ALLOCATED')).toBe(true);
    expect(isEditable('PICKED')).toBe(true);
    expect(isEditable('SHIPPED')).toBe(false);
    expect(isEditable('DELIVERED')).toBe(false);
    expect(isEditable('RECEIVED')).toBe(false);
    expect(isEditable('VERIFIED')).toBe(false);
  });

  // AC-D1/AC-D2 — deletable exactly while editable; never once shipped.
  it('AC-D1/AC-D2: deletable mirrors editable', () => {
    expect(isDeletable('PICKED')).toBe(true);
    expect(isDeletable('SHIPPED')).toBe(false);
  });

  // Contract § status lifecycle: only ALLOCATED/PICKED/SHIPPED are client-
  // settable — NEW is unreachable by update, DELIVERED+ transfer-mirrored.
  it('client-settable statuses exclude NEW and the transfer-mirrored tail', () => {
    expect([...CLIENT_SETTABLE]).toEqual(['ALLOCATED', 'PICKED', 'SHIPPED']);
  });

  // statusLabel/statusColour resolve via the map, else fall back: the raw
  // status string for the label, the default token for the colour.
  it('statusLabel/statusColour fall back for an unknown status', () => {
    // Unknown status → the ?? fallback fires (not in either map).
    expect(statusLabel('BOGUS')).toBe('BOGUS');
    expect(statusColour('BOGUS')).toBe('var(--status-new)');
    // CANCELLED sits outside the flow but has its own mapped chip token.
    expect(statusColour('CANCELLED')).toBe('var(--status-cancelled)');
  });
});
