// The list's selection: each selected item's id AND the code the delete report
// names it by. A selection outlives its page (it survives paging and sorting),
// so a code is read off the row as its id is selected — the row is on screen
// at that moment — and kept from then on (the purchase-orders list's pattern).

/** A selected item: its id, and the code the delete report names it by. */
export type CatalogueSelection = { id: string; code: string };

/** The selection after the table reports `ids` selected: every id kept keeps
 *  its code, and a newly selected one takes its code from the page. */
export const nextSelection = (
  ids: readonly string[],
  current: readonly CatalogueSelection[],
  page: readonly { id: string; code: string }[]
): CatalogueSelection[] => {
  const known = new Map(current.map(s => [s.id, s.code]));
  return ids.map(id => ({
    id,
    code: known.get(id) ?? page.find(row => row.id === id)?.code ?? '',
  }));
};
