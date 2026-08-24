// Which repack the repack modal (spec/stock S5) is showing, and what that
// means for the surfaces around it — the tinted history row, the panel below
// the table, and the Export/Print gate (AC-R8). Pure, so the decision is
// testable in node without a DOM: the modal itself renders a <dialog> and a
// table, which the unit harness cannot mount.

// The panel below the history table wears one face at a time:
//
// | face       | when                                                        |
// | ---------- | ----------------------------------------------------------- |
// | `editor`   | a new repack is being entered                                |
// | `selected` | a repack is selected AND present in the history              |
// | `prompt`   | nothing selected, with a history to select from              |
// | `none`     | nothing to say — no history and nothing selected, or a saved |
// |            | repack the refetched history does not hold yet               |
export type RepackPanelFace = 'editor' | 'selected' | 'prompt' | 'none';

// The minimum shape this needs of a repack-history node: its own id (the
// table's row key) and the document that identifies it. Structural, so the
// generated fragment type passes unchanged (kdd/type-safety — no parallel
// type).
export interface RepackSelectable {
  id: string;
  invoice: { id: string };
}

export interface RepackPanelState<T extends RepackSelectable> {
  face: RepackPanelFace;
  /** The selected repack, once the history holds it. */
  selected: T | undefined;
  /** Row keys to mark as selected — one, or none. */
  selectedRowIds: string[];
  /** Export/Print acts on a repack: is there one? */
  canPrint: boolean;
}

/*
 * The selection is held as an INVOICE id rather than a row key because that is
 * what saving a repack returns: the saved repack then selects itself the moment
 * the refetched history holds it, with no second source of truth. The cost is a
 * window — selected, not yet in the history — and the `none` face is what
 * covers it: right after a save, "select a repack" would be a lie, so the panel
 * says nothing until the row lands.
 */
export const repackPanelState = <T extends RepackSelectable>(input: {
  repacks: readonly T[];
  selectedInvoiceId: string | undefined;
  creating: boolean;
}): RepackPanelState<T> => {
  const selected = input.selectedInvoiceId
    ? input.repacks.find(r => r.invoice.id === input.selectedInvoiceId)
    : undefined;
  const canPrint = input.selectedInvoiceId !== undefined;
  return {
    face: input.creating
      ? 'editor'
      : selected
        ? 'selected'
        : input.selectedInvoiceId
          ? 'none'
          : input.repacks.length > 0
            ? 'prompt'
            : 'none',
    selected,
    // A selected repack the history doesn't hold marks no row — there is no row
    // to mark.
    selectedRowIds: selected ? [selected.id] : [],
    canPrint,
  };
};
