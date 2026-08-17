import { describe, expect, it } from 'vitest';
import type { ColumnMeta } from '@tanstack/solid-table';
import { visibleOnCard } from './columnTypes';

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
