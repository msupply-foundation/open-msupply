import type { Note } from '../../plugin-sdk/documents';

export interface NoteAuthor {
  id?: string;
  name?: string;
}

/*
 * The base document types hold notes as a list (`notes?: Note[]`), each with
 * its author and time. The host's default forms and the create-encounter
 * dialog edit one note, the first: this returns the list with that note's
 * text replaced, keeping its author and creation time once it has them and
 * stamping them when it is new. An emptied note is dropped, so clearing the
 * box leaves no empty note behind; the rest of the list is kept as it was.
 *
 * TO-DO: replace with the notes list (NotesInput), which edits every note.
 */
export const withFirstNoteText = (
  notes: readonly Note[] | undefined,
  text: string | undefined,
  author: NoteAuthor,
  now: string
): Note[] | undefined => {
  const [first, ...rest] = notes ?? [];
  if (!text) return rest.length > 0 ? rest : undefined;
  return [
    {
      ...first,
      text,
      created: first?.created ?? now,
      authorId: first?.authorId ?? author.id,
      authorName: first?.authorName ?? author.name,
    },
    ...rest,
  ];
};

/**
 * Which written notes stay editable (a deployment's JSON Forms
 * `editRestrictions`).
 */
export interface NoteEditRestrictions {
  /** Only the last note of the list (`latest`). */
  latestOnly?: boolean;
  /**
   * Only a note the signed-in user wrote, or one with no author
   * (`isCurrentUser`).
   */
  ownOnly?: boolean;
  /** Only a note written less than this many days ago (`maxAge`). */
  maxAgeDays?: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Whether the note at `index` of a list of `count` may be edited or removed.
 * A note not yet written (no `created`) always may; a written one may when
 * every restriction given allows it.
 */
export const isNoteEditable = (
  note: Note,
  index: number,
  count: number,
  restrictions: NoteEditRestrictions | undefined,
  userId: string | undefined,
  now: number
): boolean => {
  if (!note.created || !restrictions) return true;
  if (restrictions.latestOnly && index !== count - 1) return false;
  if (restrictions.ownOnly && note.authorId && note.authorId !== userId)
    return false;
  if (
    restrictions.maxAgeDays !== undefined &&
    now - new Date(note.created).getTime() >= restrictions.maxAgeDays * DAY_MS
  )
    return false;
  return true;
};

/** The list with an empty note added at its end, where a new note goes. */
export const withNewNote = (notes: readonly Note[] | undefined): Note[] => [
  ...(notes ?? []),
  { text: '' },
];

/**
 * The list with the text of the note at `index` replaced, stamping its author
 * and creation time the first time it is written and keeping them after.
 */
export const withNoteText = (
  notes: readonly Note[],
  index: number,
  text: string,
  author: NoteAuthor,
  now: string
): Note[] =>
  notes.map((note, i) =>
    i === index
      ? {
          ...note,
          text,
          created: note.created ?? now,
          authorId: note.authorId ?? author.id,
          authorName: note.authorName ?? author.name,
        }
      : note
  );

/** The list without the note at `index`; no list once it is empty. */
export const withoutNote = (
  notes: readonly Note[],
  index: number
): Note[] | undefined => {
  const rest = notes.filter((_, i) => i !== index);
  return rest.length > 0 ? rest : undefined;
};

const hasText = (note: unknown): boolean =>
  typeof note !== 'object' ||
  note === null ||
  ((note as Note).text !== undefined && (note as Note).text !== '');

/**
 * The document with every note that has no text taken out of its `notes`,
 * the base field every category's notes live in; no list once none is left.
 * The notes list keeps an empty note while the form is open, so nothing
 * moves under the pointer, and the save leaves it out.
 */
export const withoutEmptyNotes = <T>(data: T): T => {
  const notes = (data as { notes?: unknown }).notes;
  if (!Array.isArray(notes) || notes.every(hasText)) return data;
  const kept = notes.filter(hasText);
  const next: Record<string, unknown> = { ...data, notes: kept };
  if (kept.length === 0) delete next.notes;
  return next as T;
};

/*
 * Which items of the notes list are open. A note has no id and its object is
 * replaced on every keystroke, so items are tracked by their position in the
 * order shown, and what is kept is the positions the user has opened or
 * closed against the default: notes the draft gains after the form opens
 * take the default too.
 */

/** Whether the item at `position` is open. */
export const isItemOpen = (
  flipped: ReadonlySet<number>,
  position: number,
  defaultOpen: boolean
): boolean => defaultOpen !== flipped.has(position);

/** The positions flipped from the default, given those open of `count`. */
export const flippedFromOpen = (
  open: ReadonlySet<number>,
  count: number,
  defaultOpen: boolean
): Set<number> =>
  new Set(
    Array.from({ length: count }, (_, p) => p).filter(
      p => open.has(p) !== defaultOpen
    )
  );

/**
 * The flipped positions after an item is added at `at` (`by` 1) or the one
 * at `at` removed (`by` -1): the positions after it move with their notes,
 * and a removed item's own position goes.
 */
export const shiftedPositions = (
  flipped: ReadonlySet<number>,
  at: number,
  by: 1 | -1
): Set<number> =>
  new Set(
    [...flipped].flatMap(p => {
      if (by === -1 && p === at) return [];
      if (by === -1) return [p > at ? p - 1 : p];
      return [p >= at ? p + 1 : p];
    })
  );
