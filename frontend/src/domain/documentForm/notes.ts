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
 * TO-DO: replace with the notes-list control (implementation-plan H23), which
 * edits every note.
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
