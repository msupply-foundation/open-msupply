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
