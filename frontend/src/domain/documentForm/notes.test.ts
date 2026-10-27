import { describe, expect, it } from 'vitest';
import type { Note } from '../../plugin-sdk/documents';
import {
  flippedFromOpen,
  isItemOpen,
  isNoteEditable,
  shiftedPositions,
  withNewNote,
  withNoteText,
  withoutEmptyNotes,
  withoutNote,
} from './notes';

const NOW = Date.parse('2026-10-09T12:00:00Z');
const HOUR = 60 * 60 * 1000;

const written = (hoursAgo: number, authorId = 'user-a'): Note => ({
  text: 'Seen',
  created: new Date(NOW - hoursAgo * HOUR).toISOString(),
  authorId,
  authorName: 'A',
});

describe('isNoteEditable', () => {
  it('lets any note be edited when the form gives no restrictions', () => {
    expect(
      isNoteEditable(written(1000, 'user-b'), 0, 2, undefined, 'user-a', NOW)
    ).toBe(true);
  });

  it('always lets a note not yet written be edited', () => {
    const restrictions = { latestOnly: true, ownOnly: true, maxAgeDays: 1 };
    expect(
      isNoteEditable({ text: '' }, 0, 3, restrictions, 'user-a', NOW)
    ).toBe(true);
  });

  it('keeps only the last note editable with latestOnly', () => {
    const restrictions = { latestOnly: true };
    expect(isNoteEditable(written(1), 0, 2, restrictions, 'user-a', NOW)).toBe(
      false
    );
    expect(isNoteEditable(written(1), 1, 2, restrictions, 'user-a', NOW)).toBe(
      true
    );
  });

  it("keeps another user's note read-only with ownOnly, but not one with no author", () => {
    const restrictions = { ownOnly: true };
    expect(
      isNoteEditable(written(1, 'user-b'), 0, 1, restrictions, 'user-a', NOW)
    ).toBe(false);
    expect(
      isNoteEditable(written(1, 'user-a'), 0, 1, restrictions, 'user-a', NOW)
    ).toBe(true);
    const anonymous = { ...written(1), authorId: undefined };
    expect(isNoteEditable(anonymous, 0, 1, restrictions, 'user-a', NOW)).toBe(
      true
    );
  });

  it('keeps a note editable for maxAgeDays after it was written', () => {
    const restrictions = { maxAgeDays: 1 };
    expect(isNoteEditable(written(23), 0, 1, restrictions, 'user-a', NOW)).toBe(
      true
    );
    expect(isNoteEditable(written(24), 0, 1, restrictions, 'user-a', NOW)).toBe(
      false
    );
  });
});

describe('withNewNote', () => {
  it('adds an empty note at the end', () => {
    expect(withNewNote([written(1)])).toEqual([written(1), { text: '' }]);
    expect(withNewNote(undefined)).toEqual([{ text: '' }]);
  });
});

describe('withNoteText', () => {
  const author = { id: 'user-a', name: 'A' };
  const stamp = '2026-10-09T12:00:00.000Z';

  it('stamps a note the first time it is written', () => {
    expect(withNoteText([{ text: '' }], 0, 'Seen', author, stamp)).toEqual([
      { text: 'Seen', created: stamp, authorId: 'user-a', authorName: 'A' },
    ]);
  });

  it("keeps a written note's author and time, and the other notes as they were", () => {
    const first = written(5, 'user-b');
    const second = written(1);
    const next = withNoteText([first, second], 0, 'Changed', author, stamp);
    expect(next).toEqual([{ ...first, text: 'Changed' }, second]);
    expect(next[1]).toBe(second);
  });
});

describe('withoutNote', () => {
  it('removes the note at the index', () => {
    const first = written(2);
    const second = written(1);
    expect(withoutNote([first, second], 0)).toEqual([second]);
  });

  it('leaves no list once the last note goes', () => {
    expect(withoutNote([written(1)], 0)).toBeUndefined();
  });
});

describe('withoutEmptyNotes', () => {
  it('takes out every note with no text and keeps the rest in order', () => {
    const first = written(3);
    const last = { ...written(1), text: 'Later' };
    expect(
      withoutEmptyNotes({
        status: 'ACTIVE',
        notes: [{ text: '' }, first, { ...written(2), text: '' }, last],
      })
    ).toEqual({ status: 'ACTIVE', notes: [first, last] });
  });

  it('leaves no list once every note is empty', () => {
    expect(
      withoutEmptyNotes({ status: 'ACTIVE', notes: [{ text: '' }] })
    ).toEqual({ status: 'ACTIVE' });
  });

  it("keeps a note's other keys, the old client's `invalid` among them", () => {
    const flagged = { ...written(1), invalid: true };
    expect(withoutEmptyNotes({ notes: [flagged] })).toEqual({
      notes: [flagged],
    });
  });

  it('returns the document itself when there is nothing to take out', () => {
    const data = { notes: [written(1)] };
    expect(withoutEmptyNotes(data)).toBe(data);
    const none = { status: 'ACTIVE' };
    expect(withoutEmptyNotes(none)).toBe(none);
  });
});

describe('which items of the list are open', () => {
  it('reads a flipped position as the opposite of the default', () => {
    expect(isItemOpen(new Set([1]), 0, true)).toBe(true);
    expect(isItemOpen(new Set([1]), 1, true)).toBe(false);
    expect(isItemOpen(new Set([1]), 1, false)).toBe(true);
  });

  it('keeps the positions the user set against the default', () => {
    expect([...flippedFromOpen(new Set([0, 2]), 3, true)]).toEqual([1]);
    expect([...flippedFromOpen(new Set([0, 2]), 3, false)]).toEqual([0, 2]);
  });

  it('moves the positions after an added item along with their notes', () => {
    expect([...shiftedPositions(new Set([0, 2]), 1, 1)]).toEqual([0, 3]);
    expect([...shiftedPositions(new Set([0, 2]), 0, 1)]).toEqual([1, 3]);
  });

  it("drops a removed item's position and moves the ones after it back", () => {
    expect([...shiftedPositions(new Set([0, 1, 3]), 1, -1)]).toEqual([0, 2]);
  });
});
