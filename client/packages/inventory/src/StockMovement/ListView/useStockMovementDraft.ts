import { useState } from 'react';
import { ArrayUtils } from '@openmsupply-client/common';
import {
  ItemStockOnHandFragment,
  LocationRowFragment,
  useLocationList,
} from '@openmsupply-client/system';
import {
  StockMovementDraftLineFragment,
  StockMovementRowFragment,
  useStockMovementDraftLines,
} from '../api';
import { DraftStockMovementLine } from './StockMovementLineTable';

export type SelectionMode = 'byLocation' | 'byItem';
export type ItemOption = { id: string; code: string; name: string };

const toDraftLine = (
  draft: StockMovementDraftLineFragment
): DraftStockMovementLine => ({
  ...draft,
  toLocation: (draft.toLocation as LocationRowFragment | null) ?? null,
});

interface UseStockMovementDraftProps {
  isEdit: boolean;
  movement?: StockMovementRowFragment | null;
}

export const useStockMovementDraft = ({
  isEdit,
  movement,
}: UseStockMovementDraftProps) => {
  const [selectionMode, setSelectionMode] =
    useState<SelectionMode>('byLocation');
  const [fromLocation, setFromLocation] = useState<LocationRowFragment | null>(
    null
  );
  const [byItem, setByItem] = useState<ItemStockOnHandFragment | null>(null);
  const [addedItemIds, setAddedItemIds] = useState<string[]>([]);
  const [removedLineIds, setRemovedLineIds] = useState<string[]>([]);
  const [edits, setEdits] = useState<
    Record<string, Partial<DraftStockMovementLine>>
  >({});

  const {
    query: { data: locationData },
  } = useLocationList(
    {
      sortBy: { key: 'name', direction: 'asc', isDesc: false },
      first: 1000,
    },
    undefined,
    !isEdit
  );
  const locations = locationData?.nodes ?? [];

  const { data: locationDraftLines = [] } = useStockMovementDraftLines(
    { fromLocationId: fromLocation?.id },
    !isEdit && selectionMode === 'byLocation' && !!fromLocation
  );
  const { data: itemDraftLines = [] } = useStockMovementDraftLines(
    { itemId: byItem?.id },
    !isEdit && selectionMode === 'byItem' && !!byItem
  );
  const { data: editDraftLines = [] } = useStockMovementDraftLines(
    { stockRelocationId: movement?.id },
    isEdit && !!movement?.id
  );

  const sourceDraftLines = isEdit
    ? editDraftLines
    : selectionMode === 'byLocation'
      ? locationDraftLines.filter(line => addedItemIds.includes(line.itemId))
      : itemDraftLines;

  const lines: DraftStockMovementLine[] = sourceDraftLines
    .filter(draft => !removedLineIds.includes(draft.id))
    .map(draft => ({ ...toDraftLine(draft), ...edits[draft.id] }));

  const linesToMove = isEdit
    ? lines
    : lines.filter(line => !line.onHold && !!edits[line.id]);

  // Items at the from-location that haven't been added yet.
  const itemOptions = ArrayUtils.uniqBy(
    locationDraftLines
      .filter(line => !addedItemIds.includes(line.itemId))
      .map(line => ({
        id: line.itemId,
        code: line.itemCode,
        name: line.itemName,
      })),
    'id'
  ).sort((a, b) => a.name.localeCompare(b.name));

  const clearSelection = () => {
    setAddedItemIds([]);
    setRemovedLineIds([]);
    setEdits({});
  };

  const switchMode = (nextMode: SelectionMode) => {
    setSelectionMode(nextMode);
    setFromLocation(null);
    setByItem(null);
    clearSelection();
  };

  const selectFromLocation = (location: LocationRowFragment | null) => {
    setFromLocation(location);
    clearSelection();
  };

  const selectByItem = (item: ItemStockOnHandFragment | null) => {
    setByItem(item);
    clearSelection();
  };

  const onAddItem = (item: ItemOption) =>
    setAddedItemIds(prev =>
      prev.includes(item.id) ? prev : [...prev, item.id]
    );

  const onUpdate = (id: string, patch: Partial<DraftStockMovementLine>) =>
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const onRemove = (id: string) => setRemovedLineIds(prev => [...prev, id]);

  return {
    selectionMode,
    switchMode,
    fromLocation,
    selectFromLocation,
    byItem,
    selectByItem,
    locations,
    itemOptions,
    lines,
    linesToMove,
    onAddItem,
    onUpdate,
    onRemove,
  };
};
