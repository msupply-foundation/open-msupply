import { useState } from 'react';
import { ArrayUtils } from '@openmsupply-client/common';
import {
  ItemStockOnHandFragment,
  LocationRowFragment,
  StockLineRowFragment,
  useLocationList,
  useStockList,
} from '@openmsupply-client/system';
import { StockMovementRowFragment } from '../api';
import { DraftStockMovementLineState } from './StockMovementLineTable';

export type SelectionMode = 'byLocation' | 'byItem';

export type ItemOption = { id: string; code: string; name: string };

const lineFromStockLine = (
  stockLine: StockLineRowFragment
): DraftStockMovementLineState => ({
  id: stockLine.id,
  itemId: stockLine.itemId,
  itemCode: stockLine.item.code,
  itemName: stockLine.item.name,
  restrictedLocationTypeId: stockLine.item.restrictedLocationTypeId,
  fromStockLineId: stockLine.id,
  fromLocationCode: stockLine.location?.code ?? null,
  batch: stockLine.batch,
  expiryDate: stockLine.expiryDate,
  fromPackSize: stockLine.packSize,
  availableNumberOfPacks: stockLine.availableNumberOfPacks,
  onHold: stockLine.onHold || (stockLine.location?.onHold ?? false),
  fromNumberOfPacks: undefined,
  toLocation: null,
  toPackSize: undefined,
  toNumberOfPacks: undefined,
});

const lineFromMovement = (
  movement: StockMovementRowFragment
): DraftStockMovementLineState => {
  const toPackSize = movement.toPackSize ?? movement.fromPackSize;
  return {
    id: movement.id,
    itemId: '',
    itemCode: movement.itemCode,
    itemName: movement.itemName,
    restrictedLocationTypeId: movement.restrictedLocationTypeId,
    fromStockLineId: movement.fromStockLineId,
    fromLocationCode: movement.fromLocation?.code ?? null,
    batch: movement.batch,
    expiryDate: movement.expiryDate,
    fromPackSize: movement.fromPackSize,
    availableNumberOfPacks: movement.availableNumberOfPacks,
    onHold: movement.onHold || (movement.fromLocation?.onHold ?? false),
    fromNumberOfPacks: movement.numberOfPacks,
    toLocation: (movement.toLocation as LocationRowFragment | null) ?? null,
    toPackSize,
    toNumberOfPacks: toPackSize
      ? (movement.numberOfPacks * movement.fromPackSize) / toPackSize
      : undefined,
  };
};

interface UseStockMovementDraftArgs {
  isEdit: boolean;
  movement?: StockMovementRowFragment | null;
}

export const useStockMovementDraft = ({
  isEdit,
  movement,
}: UseStockMovementDraftArgs) => {
  const [selectionMode, setSelectionMode] =
    useState<SelectionMode>('byLocation');
  const [fromLocation, setFromLocation] = useState<LocationRowFragment | null>(
    null
  );
  const [byItem, setByItem] = useState<ItemStockOnHandFragment | null>(null);
  const [addedItemIds, setAddedItemIds] = useState<string[]>([]);
  const [removedLineIds, setRemovedLineIds] = useState<string[]>([]);
  const [edits, setEdits] = useState<
    Record<string, Partial<DraftStockMovementLineState>>
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

  const { data: locationStock } = useStockList(
    {
      filterBy: fromLocation
        ? { location: { id: { equalTo: fromLocation.id } } }
        : undefined,
      first: 1000,
    },
    { enabled: !isEdit && selectionMode === 'byLocation' && !!fromLocation }
  );

  const { data: itemStock } = useStockList(
    {
      filterBy: byItem ? { itemId: { equalTo: byItem.id } } : undefined,
      first: 1000,
    },
    { enabled: !isEdit && selectionMode === 'byItem' && !!byItem }
  );

  // Available stock lines for the current selection (location or item).
  const fromStockNodes = (locationStock?.nodes ?? []).filter(
    node =>
      !!fromLocation &&
      node.locationId === fromLocation.id &&
      node.availableNumberOfPacks > 0
  );
  const itemStockNodes = (itemStock?.nodes ?? []).filter(
    node =>
      !!byItem && node.itemId === byItem.id && node.availableNumberOfPacks > 0
  );

  const sourceStockLines =
    selectionMode === 'byLocation'
      ? fromStockNodes.filter(node => addedItemIds.includes(node.itemId))
      : itemStockNodes;

  const lines: DraftStockMovementLineState[] = movement
    ? [{ ...lineFromMovement(movement), ...edits[movement.id] }]
    : sourceStockLines
        .filter(stockLine => !removedLineIds.includes(stockLine.id))
        .map(stockLine => ({
          ...lineFromStockLine(stockLine),
          ...edits[stockLine.id],
        }));

  const linesToMove = isEdit
    ? lines
    : lines.filter(line => !line.onHold && !!edits[line.id]);

  // Items at the from-location that haven't been added yet.
  const itemOptions = ArrayUtils.uniqBy(
    fromStockNodes
      .filter(node => !addedItemIds.includes(node.itemId))
      .map(node => ({
        id: node.itemId,
        code: node.item.code,
        name: node.item.name,
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

  const onUpdate = (id: string, patch: Partial<DraftStockMovementLineState>) =>
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
