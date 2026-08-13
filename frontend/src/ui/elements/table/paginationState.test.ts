import { describe, expect, it } from 'vitest';
import { paginationState, type PaginationExtent } from './paginationState';

// The three states of the conditional (earned) footer — spec/ui-standards §
// tables → pagination (D101). This FE diverges from the current app here, so
// the shared e2e suites stay loose and the states are pinned by this test
// instead (e2e/AUTHORING.md § divergences). Behaviours:
//   OMS-REG-INV-05.24/.25/.26 — stocktakes list: full bar / count / no footer
//   OMS-REG-INV-03.77         — stocktake detail line table
//   OMS-REG-REPL-01.5/.26/.27 — inbound shipments list
//   OMS-REG-REPL-03.24        — inbound shipment detail line table
//
// Only these four values feed the rule.
const props = (
  total: number,
  offset = 0,
  pageSize = 20,
  conditional: PaginationExtent['conditional'] = 'count'
): PaginationExtent => ({ total, offset, pageSize, conditional });

/** The list flavour: the single-page state shows nothing rather than a count. */
const list = (total: number, offset = 0, pageSize = 20): PaginationExtent =>
  props(total, offset, pageSize, 'nothing');

/** No `conditional` at all — the stable-chrome default. Spelled out rather
 * than passed as undefined, which the default parameter above would swallow. */
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
    it('hides the footer entirely with no rows', () => {
      expect(paginationState(props(0))).toBe('hidden');
    });

    it('shows the count alone when everything fits one page', () => {
      expect(paginationState(props(1))).toBe('count');
      expect(paginationState(props(14))).toBe('count');
      // Exactly one full page is still one page.
      expect(paginationState(props(20))).toBe('count');
    });

    it('shows the full bar as soon as there is a second page', () => {
      expect(paginationState(props(21))).toBe('full');
      expect(paginationState(props(143))).toBe('full');
    });

    it('follows the chosen page size, not a fixed 20', () => {
      expect(paginationState(props(45, 0, 50))).toBe('count');
      expect(paginationState(props(45, 0, 10))).toBe('full');
    });

    it("shows nothing on a single page where the host asked for 'nothing'", () => {
      // A list: one page means every matching row is already on screen, so
      // there is no footer at all until a second page exists.
      expect(paginationState(list(0))).toBe('hidden');
      expect(paginationState(list(14))).toBe('hidden');
      expect(paginationState(list(20))).toBe('hidden');
      expect(paginationState(list(21))).toBe('full');
    });

    it('keeps the full bar when a stale offset sits past the only page', () => {
      // A shared URL (or rows deleted since it was made) can ask for page 3 of
      // a set that now fits one page. The count face has no pager, so
      // collapsing to it would strand the user on an empty page — the full bar
      // is what offers the way back to page 1.
      expect(paginationState(props(14, 40))).toBe('full');
      expect(paginationState(list(14, 40))).toBe('full');
    });
  });
});
