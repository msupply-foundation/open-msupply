import { describe, expect, it } from 'vitest';
import {
  dragStart,
  fillColumnId,
  resizeMoved,
  resizeStartWidth,
} from '@/ui/elements/table/columnResize';

// A resize drag starts from the width the user sees, and only a drag that
// changed the width is saved (#1890).

describe('resizeStartWidth', () => {
  it('starts from the drawn width when it differs from the size', () => {
    // Items Code: size 80px, drawn 134px wide by its content.
    expect(resizeStartWidth(134, 80)).toBe(134);
    // A column drawn narrower than its size (a cap) starts narrower too.
    expect(resizeStartWidth(70, 80)).toBe(70);
  });

  it('rounds the drawn width to a whole pixel, as TanStack sizes are', () => {
    expect(resizeStartWidth(133.7, 80)).toBe(134);
    expect(resizeStartWidth(133.2, 80)).toBe(133);
  });

  it('leaves the size alone when the column is drawn at its size', () => {
    expect(resizeStartWidth(128, 128)).toBeUndefined();
    expect(resizeStartWidth(127.6, 128)).toBeUndefined();
  });
});

describe('resizeMoved', () => {
  const start = { id: 'code', px: 134 };

  it('saves nothing for a press that never moved', () => {
    expect(resizeMoved(start, { code: 134, name: 300 })).toBe(false);
  });

  it('saves a drag that changed the width, either way', () => {
    expect(resizeMoved(start, { code: 234 })).toBe(true);
    expect(resizeMoved(start, { code: 100 })).toBe(true);
  });

  it('saves when there is no recorded start', () => {
    expect(resizeMoved(undefined, { code: 134 })).toBe(true);
  });

  it('saves when the dragged column is missing from the result', () => {
    expect(resizeMoved(start, { name: 300 })).toBe(true);
  });
});

describe('dragStart', () => {
  it('starts from the drawn width when it differs from the size', () => {
    expect(dragStart('code', 134, 80)).toEqual({ id: 'code', px: 134 });
  });

  it('starts from the size when the column is drawn at it', () => {
    expect(dragStart('code', 127.6, 128)).toEqual({ id: 'code', px: 128 });
  });

  it('saves nothing for a press on a capped column drawn wider than its cap', () => {
    // The column that fills the row: Status drawn at 181px against its 150px
    // cap, so getSize() reads the clamped 150. The press parks the drawn 181
    // in the sizing, and nothing moves it.
    const start = dragStart('status', 181, 150);
    expect(resizeMoved(start, { period: 300, status: 181 })).toBe(false);
  });
});

describe('fillColumnId', () => {
  const drawn = ['period', 'created', 'status'];

  it('leaves the row to the columns on their defaults while any are left', () => {
    expect(fillColumnId(drawn, {})).toBeUndefined();
    expect(fillColumnId(drawn, { period: 300, status: 120 })).toBeUndefined();
  });

  it('has the last drawn column fill the row once every column is sized', () => {
    expect(
      fillColumnId(drawn, { period: 300, created: 140, status: 120 })
    ).toBe('status');
  });

  it('ignores widths set on columns that are not drawn', () => {
    expect(fillColumnId(['period'], { period: 300, hidden: 90 })).toBe(
      'period'
    );
    expect(fillColumnId(['period', 'created'], { hidden: 90 })).toBeUndefined();
  });
});
