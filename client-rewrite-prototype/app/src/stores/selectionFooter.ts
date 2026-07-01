import { create } from 'zustand';

/*
 * Selection-footer bridge. The data table lives deep inside a tab panel; the
 * ContentFooter is rendered at the app root. Rather than prop-drill selection
 * state up and back down, the table PUBLISHES its current selection (count +
 * the actions) to this tiny store, and the footer SUBSCRIBES — so one pinned
 * bar can swap to selection actions when anything is selected. Zustand is the
 * right tool for this cross-tree channel (and is the state-management lead in
 * decision #4, consumed headlessly here). See DECISIONS.md.
 */
interface SelectionFooterState {
  count: number;
  onClear: () => void;
  onDelete: () => void;
  onCopy: () => void;
  publish: (next: {
    count: number;
    onClear: () => void;
    onDelete: () => void;
    onCopy: () => void;
  }) => void;
  reset: () => void;
}

const noop = () => {};
const empty = { count: 0, onClear: noop, onDelete: noop, onCopy: noop };

export const useSelectionFooter = create<SelectionFooterState>(set => ({
  ...empty,
  publish: next => set(next),
  reset: () => set(empty),
}));
