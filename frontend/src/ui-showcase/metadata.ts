/*
 * Showcase page metadata — the data behind each page's Table of Contents and
 * the (not-yet-built) showcase Search.
 *
 * Every standard section page (Components + Layout) exports a `PageMetadata`
 * beside its component and registers it on its `SectionDef` (sections.tsx).
 * The metadata is authored by hand, co-located with the JSX it describes —
 * explicit, not derived from the rendered cards (kdd/explicit-composition):
 * the `id`s are the real DOM anchors the page puts on its cards, the `title`s
 * mirror the card headings, and `searchTerms` add the synonyms a title misses.
 *
 * The `PageItem.id` is BOTH the in-page anchor (a DashboardCard `id`, so the
 * TOC can scroll to it) AND the item's key in the future search index. There
 * is deliberately no separate `link` field: the app is hash-routed, so a real
 * `#id` href would clobber the `#/showcase/...` route — the TOC scrolls by id
 * instead (see SectionTOC), and any link is derived from the id, never stored.
 */

/**
 * One key section within a page — a curated group anchored on its first card.
 */
export interface PageItem {
  /**
   * The in-page anchor id AND the search-index key. Page-id-prefixed kebab-case
   * (`inputs-numbers`) so it stays globally unique across the combined index
   * and any future deep-linking. Placed as the `id` on the group's first card.
   */
  id: string;
  /** TOC label + search-result title. Mirrors the anchored card's heading. */
  title: string;
  /**
   * EXTRA search keywords the `title` doesn't already contain — synonyms,
   * abbreviations, related concepts. Title words are indexed automatically
   * (buildSearchIndex tokenises them), so this holds only what the title
   * misses.
   */
  searchTerms?: string[];
}

/** A showcase page's metadata: its own identity + its key sections. */
export interface PageMetadata {
  /** The section id — doubles as the URL hash and the registry id. */
  id: string;
  /** Page title. Mirrors the section's registry label. */
  title: string;
  /**
   * Page-level keywords inherited by every item at search time — the broad
   * words a user might type to reach anything on this page (e.g. Inputs →
   * ["input", "field", "form"]).
   */
  searchTerms?: string[];
  /** The curated TOC entries, in page order. */
  items: PageItem[];
}

/**
 * A single searchable record — the shape the future Search navigates. One is
 * emitted per page (the page itself, `itemId` undefined ⇒ jump to the top) and
 * one per item. `haystack` is precomputed and lowercased so search is a cheap
 * linear scan over the flat array — the dataset is a few dozen pages, far too
 * small to justify a search library (bundle size is load-bearing here).
 */
export interface SearchEntry {
  pageId: string;
  /**
   * undefined ⇒ the entry IS the page (scroll to top); else the item anchor.
   */
  itemId?: string;
  /** Item title, or the page title for a page entry. */
  title: string;
  /** The owning page's title — for grouping results under their page. */
  pageTitle: string;
  /**
   * Lowercased match text: the title's words + the item's own searchTerms +
   * the page's searchTerms. Match a query against this.
   */
  haystack: string;
}

// Split a label/term into lowercased word tokens (drops punctuation, symbols
// like the card headings' em-dashes and `<textarea>` angle brackets).
const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter(Boolean);

const terms = (values: string[] | undefined): string[] =>
  (values ?? []).flatMap(tokenize);

/**
 * Flatten every page's metadata into the searchable `SearchEntry[]` — the
 * "Index object" the future Search reads. Built once (module-eval) from the
 * section registry. Unused until Search lands; here so the metadata shape is
 * proven to carry enough to build it.
 */
export const buildSearchIndex = (pages: PageMetadata[]): SearchEntry[] => {
  const entries: SearchEntry[] = [];
  for (const page of pages) {
    const pageTerms = terms(page.searchTerms);
    entries.push({
      pageId: page.id,
      title: page.title,
      pageTitle: page.title,
      haystack: [...tokenize(page.title), ...pageTerms].join(' '),
    });
    for (const item of page.items) {
      entries.push({
        pageId: page.id,
        itemId: item.id,
        title: item.title,
        pageTitle: page.title,
        haystack: [
          ...tokenize(item.title),
          ...terms(item.searchTerms),
          ...pageTerms,
        ].join(' '),
      });
    }
  }
  return entries;
};
