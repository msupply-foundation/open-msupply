import { useEffect, useState } from 'react';
import { FnUtils } from '@openmsupply-client/common';
import { PropertyV2OptionFragment } from '../api';

export interface DraftOption {
  id: string;
  name: string;
  translationKey: string | null;
  isDeleted: boolean;
  // True if this row was added in the current draft and has not been saved
  // yet. We use this only locally (not on the wire) so the editor can show
  // "remove" instead of "soft-delete" for un-saved rows.
  isNew: boolean;
}

const seed = (options: PropertyV2OptionFragment[]): DraftOption[] =>
  options.map(o => ({
    id: o.id,
    name: o.name,
    translationKey: o.translationKey ?? null,
    isDeleted: o.isDeleted,
    isNew: false,
  }));

export const useDraftPropertyOptions = (
  initial: PropertyV2OptionFragment[] | undefined
) => {
  const [rows, setRows] = useState<DraftOption[]>(() => seed(initial ?? []));

  // Re-seed when the underlying property changes (navigation, save success).
  useEffect(() => {
    if (initial) setRows(seed(initial));
  }, [initial]);

  const addRow = () =>
    setRows(prev => [
      ...prev,
      {
        id: FnUtils.generateUUID(),
        name: '',
        translationKey: null,
        isDeleted: false,
        isNew: true,
      },
    ]);

  const updateRow = (id: string, patch: Partial<DraftOption>) =>
    setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));

  // Un-saved rows are removed; saved rows are soft-deleted so existing values
  // continue to resolve their option name (KDD req 3).
  const removeRow = (id: string) =>
    setRows(prev =>
      prev
        .map(r =>
          r.id === id
            ? r.isNew
              ? null
              : { ...r, isDeleted: true }
            : r
        )
        .filter((r): r is DraftOption => r !== null)
    );

  const restoreRow = (id: string) =>
    setRows(prev =>
      prev.map(r => (r.id === id ? { ...r, isDeleted: false } : r))
    );

  return { rows, addRow, updateRow, removeRow, restoreRow };
};
