import { describe, expect, it } from 'vitest';
import { lineErrorCauses, lineErrorShortMessage } from './stocktakeLineErrors';

// In node vitest no dictionary is loaded, so `t()` answers with the key.
describe('lineErrorCauses (OMS-REG-INV-03.99)', () => {
  it('says why stock that moved since the count started was refused, and what to do', () => {
    expect(
      lineErrorCauses([
        'SnapshotCountCurrentCountMismatchLine',
        'SnapshotCountCurrentCountMismatchLine',
      ])
    ).toEqual(['error.snapshot-total-mismatch']);
  });

  it('gives each distinct cause once, in the order first met', () => {
    expect(
      lineErrorCauses([
        'StockLineReducedBelowZero',
        'SnapshotCountCurrentCountMismatchLine',
        'StockLineReducedBelowZero',
        'CannotEditStocktake',
      ])
    ).toEqual([
      'error.reduced-below-zero',
      'error.snapshot-total-mismatch',
      'stocktake.line-error.cannot-edit',
    ]);
  });

  it('has nothing to say when nothing was refused', () => {
    expect(lineErrorCauses([])).toEqual([]);
  });
});

describe('lineErrorShortMessage (OMS-REG-INV-03.99)', () => {
  it('gives each line error a few words for under a field', () => {
    expect(lineErrorShortMessage('SnapshotCountCurrentCountMismatchLine')).toBe(
      'stocktake.line-error.stock-changed'
    );
    expect(lineErrorShortMessage('StockLineReducedBelowZero')).toBe(
      'stocktake.line-error.stock-reserved'
    );
    expect(lineErrorShortMessage('CannotEditStocktake')).toBe(
      'stocktake.line-error.cannot-edit'
    );
  });
});
