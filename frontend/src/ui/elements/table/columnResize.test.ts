import { describe, expect, it } from 'vitest';
import {
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
