import React, { useState } from 'react';
import {
  Alert,
  Box,
  Typography,
  useTranslation,
  useNotification,
  Autocomplete,
  RadioGroup,
  NumUtils,
  useConfirmationModal,
  StockRelocationNodeStatus,
} from '@openmsupply-client/common';
import { DialogButton } from '@common/components';
import { useDialog } from '@common/hooks';
import { FormControlLabel, Radio } from '@mui/material';
import {
  ItemStockOnHandFragment,
  LocationRowFragment,
  StockItemSearchInput,
  StockLineRowFragment,
  useLocationList,
  useStockList,
} from '@openmsupply-client/system';
import {
  DraftStockMovementLine,
  useInsertStockMovement,
  useUpdateStockMovement,
} from '../api';
import {
  DraftStockMovementLineState,
  StockMovementLineTable,
} from './StockMovementLineTable';

type Mode = 'byLocation' | 'byItem';

type ItemOption = { id: string; code: string; name: string };

interface CreateStockMovementModalProps {
  open: boolean;
  onClose: () => void;
}

const lineFromStockLine = (
  stockLine: StockLineRowFragment
): DraftStockMovementLineState => {
  const onHold = stockLine.onHold || (stockLine.location?.onHold ?? false);
  return {
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
    onHold,
    fromNumberOfPacks: undefined,
    toLocation: null,
    toPackSize: undefined,
    toNumberOfPacks: undefined,
  };
};

export const CreateStockMovementModal = ({
  open,
  onClose,
}: CreateStockMovementModalProps) => {
  const t = useTranslation();
  const { success, error } = useNotification();
  const { Modal } = useDialog({ isOpen: open, onClose, disableBackdrop: true });

  const [mode, setMode] = useState<Mode>('byLocation');
  const [fromLocation, setFromLocation] = useState<LocationRowFragment | null>(
    null
  );
  const [byItem, setByItem] = useState<ItemStockOnHandFragment | null>(null);
  const [addedItemIds, setAddedItemIds] = useState<string[]>([]);
  const [removedLineIds, setRemovedLineIds] = useState<string[]>([]);
  const [edits, setEdits] = useState<
    Record<string, Partial<DraftStockMovementLineState>>
  >({});

  const { insert, isSaving } = useInsertStockMovement();
  const { update } = useUpdateStockMovement();

  const getFinaliseConfirmation = useConfirmationModal({
    iconType: 'info',
    title: t('heading.stock-movement-created'),
    message: t('messages.confirm-finalise-stock-movement'),
    buttonLabel: t('button.finalise'),
    cancelButtonLabel: t('button.not-now'),
  });

  const {
    query: { data: locationData },
  } = useLocationList({
    sortBy: { key: 'name', direction: 'asc', isDesc: false },
    filterBy: { onHold: false },
    first: 1000,
  });
  const locations = locationData?.nodes ?? [];

  const { data: locationStock } = useStockList(
    {
      filterBy: fromLocation
        ? { location: { id: { equalTo: fromLocation.id } } }
        : undefined,
      first: 1000,
    },
    { enabled: mode === 'byLocation' && !!fromLocation }
  );

  const { data: itemStock } = useStockList(
    {
      filterBy: byItem ? { itemId: { equalTo: byItem.id } } : undefined,
      first: 1000,
    },
    { enabled: mode === 'byItem' && !!byItem }
  );

  const clearSelection = () => {
    setAddedItemIds([]);
    setRemovedLineIds([]);
    setEdits({});
  };

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode);
    setFromLocation(null);
    setByItem(null);
    clearSelection();
  };

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
    mode === 'byLocation'
      ? fromStockNodes.filter(node => addedItemIds.includes(node.itemId))
      : itemStockNodes;

  const lines: DraftStockMovementLineState[] = sourceStockLines
    .filter(stockLine => !removedLineIds.includes(stockLine.id))
    .map(stockLine => ({
      ...lineFromStockLine(stockLine),
      ...edits[stockLine.id],
    }));

  const itemOptions = fromStockNodes
    .reduce<ItemOption[]>((acc, node) => {
      if (
        !acc.some(o => o.id === node.itemId) &&
        !addedItemIds.includes(node.itemId)
      ) {
        acc.push({
          id: node.itemId,
          code: node.item.code,
          name: node.item.name,
        });
      }
      return acc;
    }, [])
    .sort((a, b) => a.name.localeCompare(b.name));

  const onAddItem = (item: ItemOption) =>
    setAddedItemIds(prev =>
      prev.includes(item.id) ? prev : [...prev, item.id]
    );

  const onUpdate = (id: string, patch: Partial<DraftStockMovementLineState>) =>
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const onRemove = (id: string) =>
    setRemovedLineIds(prev => [...prev, id]);

  const resultingToPacks = (line: DraftStockMovementLineState) => {
    const toPackSize = line.toPackSize ?? line.fromPackSize;
    if (!toPackSize) return undefined;
    return ((line.fromNumberOfPacks ?? 0) * line.fromPackSize) / toPackSize;
  };

  const isValid = (line: DraftStockMovementLineState) => {
    const toPacks = resultingToPacks(line);
    return (
      (line.fromNumberOfPacks ?? 0) > 0 &&
      (line.toPackSize ?? 0) > 0 &&
      toPacks !== undefined &&
      NumUtils.isWholeNumber(toPacks)
    );
  };

  const linesToMove = lines.filter(line => !line.onHold && !!edits[line.id]);
  const hasFractionalPacks = linesToMove.some(line => {
    const toPacks = resultingToPacks(line);
    return toPacks !== undefined && toPacks > 0 && !NumUtils.isWholeNumber(toPacks);
  });
  const canSave =
    !isSaving && linesToMove.length > 0 && linesToMove.every(isValid);

  const onSave = async () => {
    const draftLines: DraftStockMovementLine[] = linesToMove.map(line => ({
      fromStockLineId: line.fromStockLineId,
      fromNumberOfPacks: line.fromNumberOfPacks ?? 0,
      toLocationId: line.toLocation?.id,
      toPackSize: line.toPackSize ?? line.fromPackSize,
    }));

    try {
      const result = await insert({
        lines: draftLines,
      });
      if (result.__typename === 'InsertStockRelocationError') {
        error(result.error.description)();
        return;
      }
      const ids = result.ids;
      getFinaliseConfirmation({
        onConfirm: async () => {
          try {
            await Promise.all(
              ids.map(id =>
                update({ id, status: StockRelocationNodeStatus.Finalised })
              )
            );
            success(t('messages.stock-movement-finalised'))();
          } catch (e) {
            error((e as Error).message)();
          }
          onClose();
        },
        onCancel: () => {
          success(t('messages.stock-movement-created'))();
          onClose();
        },
      });
    } catch (e) {
      error((e as Error).message)();
    }
  };

  return (
    <Modal
      slideAnimation={false}
      title={t('label.new-stock-movement')}
      height={700}
      width={1200}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      okButton={
        <DialogButton variant="ok" disabled={!canSave} onClick={onSave} />
      }
    >
      <Box display="flex" flexDirection="column" gap={2}>
        <RadioGroup
          row
          value={mode}
          onChange={(_, value) => switchMode(value as Mode)}
        >
          <FormControlLabel
            value="byLocation"
            control={<Radio />}
            label={t('label.select-by-location')}
          />
          <FormControlLabel
            value="byItem"
            control={<Radio />}
            label={t('label.select-by-item')}
          />
        </RadioGroup>

        {mode === 'byLocation' && (
          <Box display="flex" gap={2} alignItems="flex-end">
            <Box display="flex" flexDirection="column" gap={0.5}>
              <Typography variant="caption">
                {t('label.from-location')}
              </Typography>
              <Autocomplete<LocationRowFragment>
                width="280px"
                options={locations}
                value={fromLocation}
                getOptionLabel={location =>
                  `${location.code} - ${location.name}`
                }
                isOptionEqualToValue={(option, value) => option.id === value.id}
                onChange={(_, location) => {
                  setFromLocation(location);
                  clearSelection();
                }}
              />
            </Box>
            {fromLocation && (
              <Box display="flex" flexDirection="column" gap={0.5} flex={1}>
                <Typography variant="caption">{t('label.item')}</Typography>
                <Autocomplete<ItemOption>
                  width="100%"
                  options={itemOptions}
                  value={null}
                  clearable={false}
                  blurOnSelect
                  placeholder={t('button.add-item')}
                  getOptionLabel={item => `${item.code} - ${item.name}`}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value.id
                  }
                  onChange={(_, item) => item && onAddItem(item)}
                />
              </Box>
            )}
          </Box>
        )}

        {mode === 'byItem' && (
          <Box display="flex" flexDirection="column" gap={0.5}>
            <Typography variant="caption">{t('label.item')}</Typography>
            <StockItemSearchInput
              currentItemId={byItem?.id}
              disabled={false}
              filter={{ hasStockOnHand: true }}
              onChange={item => {
                setByItem(item);
                clearSelection();
              }}
            />
          </Box>
        )}

        {hasFractionalPacks && (
          <Alert severity="warning">
            {t('messages.stock-movement-fractional-packs')}
          </Alert>
        )}

        {lines.length > 0 ? (
          <StockMovementLineTable
            lines={lines}
            showFromLocation={mode === 'byItem'}
            onUpdate={onUpdate}
            onRemove={onRemove}
          />
        ) : (
          <Typography sx={{ color: 'gray.main' }}>
            {mode === 'byLocation'
              ? t('messages.select-from-location')
              : t('messages.select-an-item')}
          </Typography>
        )}
      </Box>
    </Modal>
  );
};
