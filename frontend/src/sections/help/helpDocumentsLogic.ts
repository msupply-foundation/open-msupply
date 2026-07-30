// Pure logic for the central help-document management screen (spec/help S2/S3).
// Colocated + pure so the title-required/trim rule and the client-side Title
// sort are unit-tested (OMS-REG-HLP-01.29/.30/.33) without the screens.

// The publish pre-check (OMS-REG-HLP-01.29/.30): a title is required and its
// surrounding whitespace trimmed. A whitespace-only title is refused
// client-side so no title-only record is created; the server enforces the same
// rule as a top-level "EmptyTitle" rejection (spec/help contract).
export type TitleCheck = { ok: true; title: string } | { ok: false };

export const titleForUpload = (raw: string): TitleCheck => {
  const title = raw.trim();
  return title.length > 0 ? { ok: true, title } : { ok: false };
};

// Client-side Title sort (OMS-REG-HLP-01.33): the management list arrives
// server-ordered newest-first, and Title is the one client-sortable column. No
// sort → the server order is preserved (identity, same array reference); a sort
// returns a sorted COPY (never mutating the source) by locale-aware title
// comparison.
export const sortDocuments = <T extends { title: string }>(
  rows: T[],
  sort: { desc: boolean } | undefined
): T[] => {
  if (!sort) return rows;
  const factor = sort.desc ? -1 : 1;
  return [...rows].sort((a, b) => factor * a.title.localeCompare(b.title));
};
