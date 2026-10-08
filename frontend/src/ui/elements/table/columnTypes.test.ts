import { describe, expect, it } from 'vitest';
import type { ColumnDef, ColumnMeta } from '@tanstack/solid-table';
import { resolveColumnVisibility, visibleOnCard } from './columnTypes';

/*
 * The card view's cell filter (CardView applies it at the one cell source every
 * later split reads — header slots, body groups, width templates). Two flags,
 * documented on the meta augmentation in columnTypes.ts:
 *  • hideOnCard      — column-wide: a table-only column appears on no card.
 *  • hideOnCardWhen  — per ROW: the field is withdrawn from just the cards it
 *    is meaningless for (the stocktake line editor's Reason on a zero-variance
 *    batch), caption and width-template share included.
 */

type Line = { counted: number | null; snapshot: number };

const level: Line = { counted: 4, snapshot: 4 };
const varied: Line = { counted: 6, snapshot: 4 };

describe('visibleOnCard', () => {
  it('shows a column with no meta, or no hide flags', () => {
    expect(visibleOnCard(undefined, level)).toBe(true);
    expect(visibleOnCard({ align: 'center' }, level)).toBe(true);
  });

  it('hides a table-only column (hideOnCard) on every row', () => {
    const meta: ColumnMeta<Line, unknown> = { hideOnCard: true };
    expect(visibleOnCard(meta, level)).toBe(false);
    expect(visibleOnCard(meta, varied)).toBe(false);
  });

  it('withdraws a field per ROW where hideOnCardWhen answers true', () => {
    const meta: ColumnMeta<Line, unknown> = {
      hideOnCardWhen: line => line.counted === line.snapshot,
    };
    expect(visibleOnCard(meta, level)).toBe(false);
    expect(visibleOnCard(meta, varied)).toBe(true);
  });

  it('lets hideOnCard win regardless of the predicate', () => {
    const meta: ColumnMeta<Line, unknown> = {
      hideOnCard: true,
      hideOnCardWhen: () => false,
    };
    expect(visibleOnCard(meta, varied)).toBe(false);
  });

  // COMPILE-TIME guard on the meta's declaration style. hideOnCardWhen is
  // declared METHOD-style so its parameter is bivariant: the cell helpers in
  // tableHelpers build their metas against the row-erased
  // `ColumnMeta<never, unknown>`, and a property-style arrow type would make
  // this assignment a contravariance error under strictFunctionTypes. If a
  // cleanup rewrites the declaration to `hideOnCardWhen?: (row) => boolean`,
  // this file stops compiling — that is the assertion.
  it('an erased meta accepts a concrete row predicate (method bivariance)', () => {
    const erased: ColumnMeta<never, unknown> = {
      hideOnCardWhen: (line: Line) => line.counted === null,
    };
    expect(visibleOnCard<Line>(erased, { counted: null, snapshot: 0 })).toBe(
      false
    );
  });
});

/*
 * The structural-column visibility guard. `hideFromColumnSettings` promises the
 * column "stays on screen" (it only takes the Columns-popover row away), but
 * TanStack reads columnVisibility regardless — so a `false` persisted for that
 * id while the column was still user-hideable would keep hiding it with no
 * control left able to reach it. resolveColumnVisibility is what makes the flag
 * mean what it says.
 */
describe('resolveColumnVisibility', () => {
  const defs = [
    { id: 'batch', meta: { hideFromColumnSettings: true } },
    { id: 'onHold', meta: { hideFromColumnSettings: true } },
    { id: 'comment' },
  ] as ColumnDef<Line>[];

  it('returns the same map when nothing needs forcing', () => {
    const persisted = { comment: false };
    expect(resolveColumnVisibility(persisted, defs)).toBe(persisted);
    expect(resolveColumnVisibility({}, defs)).toEqual({});
  });

  it('forces a structural column back on, leaving the rest alone', () => {
    expect(
      resolveColumnVisibility({ onHold: false, comment: false }, defs)
    ).toEqual({ onHold: true, comment: false });
  });

  it('forces every structural column that was switched off', () => {
    expect(
      resolveColumnVisibility({ batch: false, onHold: false }, defs)
    ).toEqual({ batch: true, onHold: true });
  });

  it('leaves an ordinary hidden column hidden', () => {
    const persisted = { comment: false, onHold: true };
    expect(resolveColumnVisibility(persisted, defs)).toBe(persisted);
  });
});
