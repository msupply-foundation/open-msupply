/*
 * Text folding for client-side substring search.
 *
 * A plain `toLowerCase().includes()` filter is accent-SENSITIVE, which makes a
 * list unsearchable for exactly the users whose data carries accents: typing
 * `depot` finds nothing in a list holding `Dépôt Régional`, and the user has no
 * way to know the app wanted a `ô`. Folding both sides to unaccented lower case
 * makes the query and the data meet in the middle — an accented query still
 * matches an unaccented name, so nobody is punished for typing either form.
 *
 * NFD splits a composed character into its base letter plus combining marks;
 * dropping the `\p{Diacritic}` marks leaves the base. That covers Latin accents
 * (é → e) and Arabic tashkeel alike, and leaves scripts without combining marks
 * (CJK, Cyrillic) untouched.
 *
 * Deliberately NOT `localeCompare`/`Intl.Collator` with `sensitivity: 'base'`:
 * a collator compares whole strings, and there is no substring form of it — a
 * `contains` search has to fold first and match after.
 */

/** Fold for search: unaccented, lower case. */
export const foldForSearch = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/**
 * Whether any of `fields` contains `query` as a substring, both folded.
 * An empty (or whitespace-only) query matches everything, so callers can pass
 * an unfiltered input straight through.
 */
export const matchesSearch = (query: string, ...fields: string[]): boolean => {
  const folded = foldForSearch(query.trim());
  if (!folded) return true;
  return fields.some(field => foldForSearch(field).includes(folded));
};
