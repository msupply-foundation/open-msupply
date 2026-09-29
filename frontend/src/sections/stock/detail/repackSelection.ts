// Which repack the repack modal (spec/stock S5) is showing, and what that
// means for the surfaces around it — the tinted history row, the panel below
// the table, and the Export/Print gate (OMS-REG-SMV-08 `.24`, `.25`) — plus the
// values a new repack starts from (`.27`). Pure, so both are testable in node
// without a DOM: the modal itself renders a <dialog> and a table, which the
// unit harness cannot mount.

// The panel below the history table wears one face at a time:
//
// | face       | when                                            |
// | ---------- | ----------------------------------------------- |
// | `editor`   | a new repack is being entered                   |
// | `selected` | a repack is selected AND present in the history |
// | `prompt`   | nothing selected, with a history to select from |
// | `none`     | nothing to say — no history                     |
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
 * The selection is held as an INVOICE id rather than a row key because the
 * repack report is fetched by invoice. A selection the history does not hold
 * counts as none: nothing is marked, shown, or printable.
 */
export const repackPanelState = <T extends RepackSelectable>(input: {
  repacks: readonly T[];
  selectedInvoiceId: string | undefined;
  creating: boolean;
}): RepackPanelState<T> => {
  const selected = input.selectedInvoiceId
    ? input.repacks.find(r => r.invoice.id === input.selectedInvoiceId)
    : undefined;
  return {
    face: input.creating
      ? 'editor'
      : selected
        ? 'selected'
        : input.repacks.length > 0
          ? 'prompt'
          : 'none',
    selected,
    selectedRowIds: selected ? [selected.id] : [],
    canPrint: selected !== undefined,
  };
};

// The minimum shape the new-repack defaults need of the stock line — the
// generated detail fragment passes unchanged.
export interface RepackSource<L> {
  availableNumberOfPacks: number;
  location?: L | null;
}

export interface NewRepackDraft<L> {
  numberOfPacks: number;
  newPackSize: number;
  newLocation: L | null;
}

/*
 * What a new repack starts from (OMS-REG-SMV-08 `.27`, issue #516): the common
 * case, where a bulk carton is broken down whole for issue — every available
 * pack, down to single units, staying where it is. Each is one edit away from
 * the rarer choices (one pack, another size, another location, or none).
 */
export const newRepackDraft = <L>(
  line: RepackSource<L>
): NewRepackDraft<L> => ({
  numberOfPacks: line.availableNumberOfPacks,
  newPackSize: 1,
  newLocation: line.location ?? null,
});
