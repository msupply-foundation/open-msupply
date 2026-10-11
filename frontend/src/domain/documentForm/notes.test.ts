import { describe, expect, it } from 'vitest';
import type { Note } from '../../plugin-sdk/documents';
import {
  isNoteEditable,
  withNewNote,
  withNoteText,
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
