// The reactive half of the preference-catalogue domain module: the grouped,
// filtered catalogue a page renders, and the open-group state its accordion
// runs on. Shared by the global preferences page and the store editor's
// Preferences tab, which had held character-identical copies of both.
//
// `catalogue.ts` beside it stays Solid-free — the grouping and filtering are
// pure functions, tested as such. This file adds only the memoisation and the
// one piece of state (which groups the user has opened), which is what the two
// pages were duplicating (kdd/domain-modules).

import { createMemo, createSignal, type Accessor } from 'solid-js';
import {
  filterCatalogue,
  type CatalogueGroup,
  type GroupedCatalogue,
} from './catalogue';

export interface CatalogueViewOptions<P, L extends string> {
  /** The served catalogue, in served order — the display order. */
  preferences: Accessor<P[]>;
  /**
   * The page's own grouping: which of its keys sit in which group. Passed
   * rather than a key→group map so each page keeps that map beside its own
   * preference type (`groupPreferences` / `groupStorePreferences`).
   */
  group: (preferences: P[]) => GroupedCatalogue<P, L>;
  /** The displayed label a row is filtered on. */
  labelOf: (preference: P) => string;
  /** The displayed heading a group is filtered on. */
  groupLabelOf: (group: CatalogueGroup<P, L>) => string;
  /** The filter term as typed, untrimmed. */
  filter: Accessor<string>;
}

export interface CatalogueView<P, L extends string> {
  /** The catalogue as shown: ungrouped rows and groups, both filtered. */
  catalogue: Accessor<GroupedCatalogue<P, L>>;
  /** Nothing survived the filter — the gate on the shared empty state. */
  nothingVisible: Accessor<boolean>;
  /**
   * Spread onto the groups' `<Accordion multiple>`. A getter, so the spread
   * stays reactive through `mergeProps`.
   */
  accordionProps: {
    readonly value: string[];
    onValueChange: (ids: string[]) => void;
  };
}

export const createCatalogueView = <P, L extends string>(
  options: CatalogueViewOptions<P, L>
): CatalogueView<P, L> => {
  // Grouped once per catalogue and filtered once per keystroke. Both memoised
  // so the group objects keep their identity while the term changes and a
  // keyed list over them never remounts an accordion item on typing
  // (kdd/solid-reactivity-pitfalls).
  const grouped = createMemo(() => options.group(options.preferences()));
  const catalogue = createMemo(() =>
    filterCatalogue(
      grouped(),
      options.labelOf,
      options.groupLabelOf,
      options.filter()
    )
  );
  const nothingVisible = () => {
    const { ungrouped, groups } = catalogue();
    return ungrouped.length === 0 && groups.length === 0;
  };

  // Which groups are open: the user's own choice, closed on arrival. While a
  // filter is active every kept group is held open so the rows it matched on
  // are visible, and the user's choice is neither consulted nor overwritten —
  // clearing the filter hands the groups straight back to it.
  const [openGroups, setOpenGroups] = createSignal<string[]>([]);
  const filtering = () => options.filter().trim() !== '';

  return {
    catalogue,
    nothingVisible,
    accordionProps: {
      get value() {
        return filtering()
          ? catalogue().groups.map(group => group.id)
          : openGroups();
      },
      onValueChange: ids => {
        if (!filtering()) setOpenGroups(ids);
      },
    },
  };
};
