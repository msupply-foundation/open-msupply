// The preference-catalogue domain module (kdd/domain-modules): splitting a
// served preference catalogue into ungrouped rows and collapsible groups, and
// filtering it on displayed labels. Shared by the global preferences page and
// the store editor's Preferences tab, which differ only in their preference
// type and in which keys belong to which group. No Solid, no fetching.

/**
 * A collapsible group of preferences. `id` is the fixed kebab-case key the
 * accordion item is keyed by and the `accordion-trigger-<id>` test id derives
 * from (e2e/TESTIDS.md) — never display copy. `labelKey` is its heading.
 */
export interface PreferenceGroupDef<L extends string = string> {
  id: string;
  labelKey: L;
}

/**
 * Every group a preference catalogue knows, declared once so a group that
 * appears on both pages (Procurement) carries the same id and heading.
 */
export const PREFERENCE_GROUPS = {
  procurement: { id: 'procurement', labelKey: 'label.procurement' },
  averageMonthlyConsumption: {
    id: 'average-monthly-consumption',
    labelKey: 'title.average-monthly-consumption',
  },
  expiredStock: { id: 'expired-stock', labelKey: 'label.expired-stock' },
  backdating: { id: 'backdating', labelKey: 'label.backdating' },
} as const satisfies Record<string, PreferenceGroupDef>;

export type PreferenceGroupLabelKey =
  (typeof PREFERENCE_GROUPS)[keyof typeof PREFERENCE_GROUPS]['labelKey'];

export interface CatalogueGroup<
  P,
  L extends string = string,
> extends PreferenceGroupDef<L> {
  members: P[];
}

export interface GroupedCatalogue<P, L extends string = string> {
  ungrouped: P[];
  groups: CatalogueGroup<P, L>[];
}

/*
 * Split a served catalogue into the ungrouped rows and the collapsible groups.
 * Both orders derive from the SERVED order: a group appears where its first
 * member does, and members keep catalogue order. Anything absent from
 * `groupOf` is ungrouped.
 */
export const groupCatalogue = <P extends { key: string }, L extends string>(
  preferences: readonly P[],
  groupOf: Partial<Record<P['key'], PreferenceGroupDef<L>>>
): GroupedCatalogue<P, L> => {
  const ungrouped: P[] = [];
  const groups: CatalogueGroup<P, L>[] = [];
  for (const preference of preferences) {
    const def = groupOf[preference.key as P['key']];
    if (!def) {
      ungrouped.push(preference);
      continue;
    }
    const group = groups.find(g => g.id === def.id);
    if (group) group.members.push(preference);
    else groups.push({ ...def, members: [preference] });
  }
  return { ungrouped, groups };
};

/** Case-insensitive substring match on a displayed label — a blank term
 *  matches everything (`includes('')` is always true). */
export const matchesPreferenceFilter = (label: string, term: string): boolean =>
  label.toLowerCase().includes(term.trim().toLowerCase());

/*
 * The filtered catalogue: ungrouped rows match on their own label; a group is
 * all-or-nothing — kept whole when its label or ANY member matches. The filter
 * only hides rows; it never changes what a save sends.
 *
 * A blank term hands back the very same catalogue, and a non-blank one keeps
 * the surviving group and preference objects, so a keyed list rendering the
 * result never remounts an item just because the term changed.
 */
export const filterCatalogue = <P, L extends string>(
  catalogue: GroupedCatalogue<P, L>,
  labelOf: (preference: P) => string,
  groupLabelOf: (group: CatalogueGroup<P, L>) => string,
  term: string
): GroupedCatalogue<P, L> => {
  if (term.trim() === '') return catalogue;
  return {
    ungrouped: catalogue.ungrouped.filter(preference =>
      matchesPreferenceFilter(labelOf(preference), term)
    ),
    groups: catalogue.groups.filter(
      group =>
        matchesPreferenceFilter(groupLabelOf(group), term) ||
        group.members.some(member =>
          matchesPreferenceFilter(labelOf(member), term)
        )
    ),
  };
};
