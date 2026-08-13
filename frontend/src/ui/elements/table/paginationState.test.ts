import { describe, expect, it } from 'vitest';
import { paginationState, type PaginationExtent } from './paginationState';

// The conditional (earned) footer — spec/ui-standards § tables → pagination
// (D102). This FE diverges from the current app here, so the shared e2e suites
// stay loose and the rule is pinned by this test instead (e2e/AUTHORING.md §
// divergences). Behaviours:
//   OMS-REG-INV-05.24/.25  — stocktakes list: the pager exists only past one page
//   OMS-REG-INV-03.77      — stocktake detail: the pager rides the status bar
//   OMS-REG-REPL-01.5/.26  — inbound shipments list
//   OMS-REG-REPL-03.24     — inbound shipment detail
//
// Only these four values feed the rule.
const props = (total: number, offset = 0, pageSize = 20): PaginationExtent => ({
  total,
  offset,
  pageSize,
  conditional: true,
});

/** No `conditional` at all — the stable-chrome default. */
const stable = (total: number): PaginationExtent => ({
  total,
  offset: 0,
  pageSize: 20,
});

describe('paginationState', () => {
  describe('the stable-chrome default (no `conditional`)', () => {
    it('is the full bar at every row count, including zero', () => {
      expect(paginationState(stable(0))).toBe('full');
      expect(paginationState(stable(14))).toBe('full');
      expect(paginationState(stable(143))).toBe('full');
    });
  });

  describe('the conditional footer', () => {
    it('renders nothing with no rows', () => {
      expect(paginationState(props(0))).toBe('hidden');
    });

    it('renders nothing while everything fits one page', () => {
      expect(paginationState(props(1))).toBe('hidden');
      expect(paginationState(props(14))).toBe('hidden');
      // Exactly one full page is still one page.
      expect(paginationState(props(20))).toBe('hidden');
    });

    it('appears as soon as there is a second page', () => {
      expect(paginationState(props(21))).toBe('full');
      expect(paginationState(props(143))).toBe('full');
    });

    it('follows the chosen page size, not a fixed 20', () => {
      expect(paginationState(props(45, 0, 50))).toBe('hidden');
      expect(paginationState(props(45, 0, 10))).toBe('full');
    });

    it('stays put when a stale offset sits past the only page', () => {
      // A shared URL (or rows deleted since it was made) can ask for page 3 of
      // a set that now fits one page. Hiding the pager there would strand the
      // user on an empty page — the bar is what offers the way back to page 1.
      expect(paginationState(props(14, 40))).toBe('full');
    });
  });
});
