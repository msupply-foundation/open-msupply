import React from 'react';
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
  ModalMode,
} from '@openmsupply-client/common';
import { DialogButton } from '@common/components';
import { useDialog } from '@common/hooks';
import { FormControlLabel, Radio } from '@mui/material';
import {
  LocationRowFragment,
  StockItemSearchInput,
} from '@openmsupply-client/system';
import {
  StockMovementRowFragment,
  useDeleteStockMovement,
  useFinaliseStockMovements,
  useInsertStockMovement,
  useUpdateStockMovement,
} from '../api';
import {
  DraftStockMovementLine,
  StockMovementLineTable,
} from './StockMovementLineTable';
import {
  ItemOption,
  SelectionMode,
  useStockMovementDraft,
} from './useStockMovementDraft';

interface StockMovementModalProps {
  open: boolean;
  onClose: () => void;
  mode: ModalMode | null;
  movement?: StockMovementRowFragment | null;
}

export const StockMovementModal = ({
  open,
  onClose,
  mode,
  movement,
}: StockMovementModalProps) => {
  const t = useTranslation();
  const { success, error } = useNotification();
  const { Modal } = useDialog({ isOpen: open, onClose, disableBackdrop: true });

  const isEdit = mode === ModalMode.Update;
  const isDisabled = movement?.status === StockRelocationNodeStatus.Finalised;

  const {
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
  } = useStockMovementDraft({ isEdit, movement });

  const { insert, isSaving } = useInsertStockMovement();
  const { update, isUpdating } = useUpdateStockMovement();
  const { finalise, isFinalising } = useFinaliseStockMovements();
  const { delete: deleteMovement, isDeleting } = useDeleteStockMovement();

  const getDeleteConfirmation = useConfirmationModal({
    iconType: 'alert',
    title: t('heading.delete-stock-movement'),
    message: t('messages.confirm-delete-stock-movement'),
    buttonLabel: t('button.delete'),
  });

  const getCreateFinaliseConfirmation = useConfirmationModal({
    iconType: 'info',
    title: t('heading.stock-movement-created'),
    message: t('messages.confirm-finalise-stock-movement'),
    buttonLabel: t('button.finalise'),
    cancelButtonLabel: t('button.not-now'),
  });

  const getEditFinaliseConfirmation = useConfirmationModal({
    iconType: 'help',
    title: t('heading.finalise-stock-movement'),
    message: t('messages.confirm-finalise-stock-movement-edit'),
    buttonLabel: t('button.finalise'),
    cancelButtonLabel: t('button.cancel'),
  });

  const resultingToPacks = (line: DraftStockMovementLine) => {
    const toPackSize = line.toPackSize ?? line.fromPackSize;
    if (!toPackSize) return undefined;
    return ((line.fromNumberOfPacks ?? 0) * line.fromPackSize) / toPackSize;
  };

  const isValid = (line: DraftStockMovementLine) => {
    const toPacks = resultingToPacks(line);
    return (
      (line.fromNumberOfPacks ?? 0) > 0 &&
      (line.fromNumberOfPacks ?? 0) <= line.availableNumberOfPacks &&
      (line.toPackSize ?? 0) > 0 &&
      toPacks !== undefined &&
      NumUtils.isWholeNumber(toPacks)
    );
  };

  const hasFractionalPacks = linesToMove.some(line => {
    const toPacks = resultingToPacks(line);
    return (
      toPacks !== undefined && toPacks > 0 && !NumUtils.isWholeNumber(toPacks)
    );
  });

  const canSave =
    !isSaving &&
    !isUpdating &&
    !isFinalising &&
    !isDisabled &&
    linesToMove.length > 0 &&
    linesToMove.every(isValid);

  const onCreate = async () => {
    const draftLines = linesToMove.map(line => ({
      fromStockLineId: line.fromStockLineId,
      fromNumberOfPacks: line.fromNumberOfPacks ?? 0,
      toLocationId: line.toLocation?.id,
      toPackSize: line.toPackSize ?? line.fromPackSize,
    }));

    try {
      const result = await insert({ lines: draftLines });
      const ids = result.ids;
      getCreateFinaliseConfirmation({
        onConfirm: async () => {
          try {
            await finalise(ids);
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

  const onSave = async (status?: StockRelocationNodeStatus) => {
    const line = lines[0];
    if (!movement || !line) return;
    try {
      await update({
        id: movement.id,
        fromNumberOfPacks: line.fromNumberOfPacks ?? 0,
        toPackSize: line.toPackSize ?? line.fromPackSize,
        toLocationId: { value: line.toLocation?.id ?? null },
        ...(status ? { status } : {}),
      });
      success(
        status === StockRelocationNodeStatus.Finalised
          ? t('messages.stock-movement-finalised')
          : t('messages.stock-movement-saved')
      )();
      onClose();
    } catch (e) {
      error((e as Error).message)();
    }
  };

  const onEditFinalise = () =>
    getEditFinaliseConfirmation({
      onConfirm: () => onSave(StockRelocationNodeStatus.Finalised),
    });

  const onDelete = () => {
    if (!movement) return;
    getDeleteConfirmation({
      onConfirm: async () => {
        try {
          await deleteMovement(movement.id);
          success(t('messages.stock-movement-deleted'))();
          onClose();
        } catch (e) {
          error((e as Error).message)();
        }
      },
    });
  };

  const title = isEdit
    ? isDisabled
      ? t('label.stock-movement')
      : t('label.edit-stock-movement')
    : t('label.new-stock-movement');

  return (
    <Modal
      slideAnimation={false}
      title={title}
      height={700}
      width={1200}
      cancelButton={
        <DialogButton
          variant={isDisabled ? 'close' : 'cancel'}
          onClick={onClose}
        />
      }
      deleteButton={
        isEdit && !isDisabled ? (
          <DialogButton
            variant="delete"
            disabled={isDeleting}
            onClick={onDelete}
          />
        ) : undefined
      }
      saveButton={
        isEdit && !isDisabled ? (
          <DialogButton
            variant="save"
            disabled={!canSave}
            onClick={() => onSave()}
          />
        ) : undefined
      }
      okButton={
        isDisabled ? undefined : (
          <DialogButton
            variant="ok"
            customLabel={isEdit ? t('button.finalise') : undefined}
            disabled={!canSave}
            onClick={isEdit ? onEditFinalise : onCreate}
          />
        )
      }
    >
      <Box display="flex" flexDirection="column" gap={2}>
        {!isEdit && (
          <RadioGroup
            row
            value={selectionMode}
            onChange={(_, value) => switchMode(value as SelectionMode)}
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
        )}

        {!isEdit && selectionMode === 'byLocation' && (
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
                  `${location.code} - ${location.name}${location.onHold ? ` (${t('label.on-hold')})` : ''
                  }`
                }
                getOptionDisabled={location => location.onHold}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                onChange={(_, location) => selectFromLocation(location)}
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

        {!isEdit && selectionMode === 'byItem' && (
          <Box display="flex" flexDirection="column" gap={0.5}>
            <Typography variant="caption">{t('label.item')}</Typography>
            <StockItemSearchInput
              currentItemId={byItem?.id}
              disabled={false}
              filter={{ hasStockOnHand: true }}
              onChange={item => selectByItem(item)}
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
            showFromLocation={isEdit || selectionMode === 'byItem'}
            onUpdate={onUpdate}
            onRemove={isEdit ? undefined : onRemove}
            disabled={isDisabled}
          />
        ) : (
          !isEdit && (
            <Typography sx={{ color: 'gray.main' }}>
              {selectionMode === 'byLocation'
                ? t('messages.select-from-location')
                : t('messages.select-an-item')}
            </Typography>
          )
        )}
      </Box>
    </Modal>
  );
};
