import { describe, expect, it } from 'vitest';
import { nextSelection } from './selection';

// Anchors: OMS-REG-CAT-09.5 / .6 — a bulk delete deletes every selected item
// and names each refused one; the selection is carried across pages.

const page1 = [{ id: 'a', code: 'A-1' }];
const page2 = [{ id: 'b', code: 'B-2' }];

describe('OMS-REG-CAT-09.5 / .6 — the selection survives paging', () => {
  it('an item selected on page 1 keeps its code once page 2 is showing', () => {
    const onPage1 = nextSelection(['a'], [], page1);
    const onPage2 = nextSelection(['a', 'b'], onPage1, page2);
    expect(onPage2).toEqual([
      { id: 'a', code: 'A-1' },
      { id: 'b', code: 'B-2' },
    ]);
  });
  it('deselecting drops only that item', () => {
    const both = [
      { id: 'a', code: 'A-1' },
      { id: 'b', code: 'B-2' },
    ];
    expect(nextSelection(['b'], both, page1)).toEqual([
      { id: 'b', code: 'B-2' },
    ]);
  });
});
