import React, { useState } from 'react';
import {
  ArrowRightIcon,
  Autocomplete,
  BasicTextInput,
  Box,
  DialogButton,
  FnUtils,
  ModalMode,
  NumericTextInput,
  Typography,
  UNDEFINED_STRING_VALUE,
  useDialog,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import {
  LocationRowFragment,
  LocationSearchInput,
  StockItemSearchInput,
} from '@openmsupply-client/system';
import {
  StockMovementDraftLineFragment,
  StockMovementFragment,
  StockMovementLineFragment,
  useStockMovementDraftLines,
  useUpsertStockMovementLine,
} from '../../api';

const ARROW_WIDTH = 24;

interface DraftLine {
  itemId: string | null;
  stockLine: StockMovementDraftLineFragment | null;
  destinationLocation: LocationRowFragment | null | undefined;
  numberOfPacks: number | null | undefined;
}

const emptyDraft = (): DraftLine => ({
  itemId: null,
  stockLine: null,
  destinationLocation: undefined,
  numberOfPacks: undefined,
});

interface StockMovementLineEditProps {
  movement: StockMovementFragment;
  line: StockMovementLineFragment | null;
  mode: ModalMode | null;
  isOpen: boolean;
  onClose: () => void;
}

export const StockMovementLineEdit = ({
  movement,
  line,
  mode,
  isOpen,
  onClose,
}: StockMovementLineEditProps) => {
  const t = useTranslation();
  const { error } = useNotification();
  const isUpdate = mode === ModalMode.Update;
  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });
  const { upsert, isUpserting } = useUpsertStockMovementLine();

  const [draft, setDraft] = useState<DraftLine>(() => ({
    ...emptyDraft(),
    itemId: line?.stockLine?.itemId ?? null,
    numberOfPacks: line?.numberOfPacks,
  }));
  const [itemInputKey, setItemInputKey] = useState(0);

  const { data: stockLines, isLoading } = useStockMovementDraftLines(
    { itemId: draft.itemId },
    !!draft.itemId
  );

  const { data: lineDrafts } = useStockMovementDraftLines(
    { stockRelocationLineId: line?.id },
    isUpdate
  );
  const lineDraft = lineDrafts?.[0];

  const defaultStockLine = isUpdate
    ? lineDraft
    : stockLines?.length === 1
      ? stockLines[0]
      : undefined;
  const stockLine = draft.stockLine ?? defaultStockLine ?? null;

  const destinationLocation =
    draft.destinationLocation === undefined
      ? (lineDraft?.destinationLocation ?? null)
      : draft.destinationLocation;

  const numberOfPacks =
    draft.numberOfPacks === null
      ? undefined
      : (draft.numberOfPacks ?? stockLine?.availableNumberOfPacks);

  const getStockLineLabel = (stockLine: StockMovementDraftLineFragment) => {
    const label = t('label.stock-line-option', {
      batch: stockLine.batch ?? UNDEFINED_STRING_VALUE,
      packSize: stockLine.packSize,
      packs: stockLine.totalNumberOfPacks,
    });
    return stockLine.sourceLocation?.onHold
      ? `${label} (${t('label.on-hold')})`
      : label;
  };

  const onChangeItem = (itemId: string | null) =>
    setDraft(d => ({
      ...d,
      itemId,
      stockLine: null,
      numberOfPacks: undefined,
    }));

  const onChangeStockLine = (selected: StockMovementDraftLineFragment | null) =>
    setDraft(d => ({
      ...d,
      stockLine: selected,
      numberOfPacks: undefined,
      destinationLocation: null,
    }));

  const isValid =
    !!stockLine &&
    !!destinationLocation &&
    destinationLocation.id !== stockLine.sourceLocation?.id &&
    (numberOfPacks ?? 0) >= 1 &&
    (numberOfPacks ?? 0) <= stockLine.availableNumberOfPacks;

  const save = async (): Promise<boolean> => {
    if (!stockLine || !destinationLocation) return false;
    try {
      const response = await upsert({
        id: line?.id ?? FnUtils.generateUUID(),
        stockRelocationId: movement.id,
        stockLineId: stockLine.stockLineId,
        numberOfPacks: numberOfPacks ?? 0,
        destinationLocationId: destinationLocation.id,
      });
      if (response?.__typename === 'UpsertStockRelocationLineError') {
        error(response.error.description)();
        return false;
      }
      return true;
    } catch (e) {
      error((e as Error).message)();
      return false;
    }
  };

  const onOk = async () => {
    if (await save()) onClose();
  };

  const onNext = async () => {
    if (await save()) {
      setDraft(emptyDraft());
      setItemInputKey(key => key + 1);
    }
  };

  return (
    <Modal
      title={isUpdate ? t('heading.edit-line') : t('heading.add-line')}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      nextButton={
        <DialogButton
          variant="next-and-ok"
          onClick={onNext}
          disabled={isUpdate || !isValid || isUpserting}
        />
      }
      okButton={
        <DialogButton
          variant="ok"
          customLabel={isUpdate ? undefined : t('button.add-line')}
          onClick={onOk}
          disabled={!isValid || isUpserting}
        />
      }
      height={520}
      width={700}
      slideAnimation={false}
    >
      <Box display="flex" flexDirection="column" gap={2} paddingX={1}>
        <Field label={t('label.item', { count: 1 })}>
          <StockItemSearchInput
            key={itemInputKey}
            autoFocus={!draft.itemId}
            openOnFocus={!draft.itemId}
            disabled={isUpdate}
            currentItemId={draft.itemId}
            onChange={item => onChangeItem(item?.id ?? null)}
            filter={{ hasStockOnHand: true }}
          />
        </Field>
        {draft.itemId && (
          <Field label={t('label.batch')}>
            <Autocomplete
              options={stockLines ?? []}
              loading={isLoading}
              value={stockLine}
              width="100%"
              clearable={false}
              getOptionLabel={getStockLineLabel}
              getOptionDisabled={option => !!option.sourceLocation?.onHold}
              isOptionEqualToValue={(option, value) =>
                option.stockLineId === value.stockLineId
              }
              onChange={(_, option) => onChangeStockLine(option)}
              noOptionsText={t('messages.no-stock-available')}
            />
          </Field>
        )}
        {stockLine && (
          <>
            <Box display="flex" gap={2}>
              <Field label={t('label.source-location')}>
                <BasicTextInput
                  disabled
                  fullWidth
                  value={
                    stockLine.sourceLocation?.code ?? UNDEFINED_STRING_VALUE
                  }
                />
              </Field>
              <Box
                display="flex"
                alignItems="center"
                paddingTop={3}
                width={ARROW_WIDTH}
              >
                <ArrowRightIcon color="primary" />
              </Box>
              <Field label={t('label.destination-location')}>
                <LocationSearchInput
                  selectedLocation={destinationLocation}
                  disabled={false}
                  clearable
                  fullWidth
                  restrictedToLocationTypeId={
                    stockLine.restrictedLocationTypeId
                  }
                  getDisabledReason={location => {
                    if (location.onHold) return t('label.on-hold');
                    if (location.id === stockLine.sourceLocation?.id)
                      return t('label.source-location');
                    return undefined;
                  }}
                  onChange={destinationLocation =>
                    setDraft(d => ({ ...d, destinationLocation }))
                  }
                />
              </Field>
            </Box>
            <Box display="flex" gap={2}>
              <Field label={t('label.for-reference')}>
                <Box
                  sx={{
                    backgroundColor: 'background.drawer',
                    borderRadius: 2,
                    padding: '9px 12px',
                  }}
                >
                  <Typography>
                    {t('label.pack-size')} <b>{stockLine.packSize}</b>
                    {' · '}
                    {t('label.packs-in-stock')}{' '}
                    <b>{stockLine.totalNumberOfPacks}</b>
                  </Typography>
                </Box>
              </Field>
              <Box width={ARROW_WIDTH} />
              <Field label={t('label.packs-to-move')}>
                <NumericTextInput
                  fullWidth
                  min={1}
                  max={stockLine.availableNumberOfPacks}
                  value={numberOfPacks}
                  onChange={value =>
                    setDraft(d => ({ ...d, numberOfPacks: value ?? null }))
                  }
                />
                <Typography variant="caption" sx={{ color: 'gray.main' }}>
                  {t('messages.move-all-or-partial', {
                    max: stockLine.availableNumberOfPacks,
                  })}
                </Typography>
              </Field>
            </Box>
          </>
        )}
      </Box>
    </Modal>
  );
};

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <Box display="flex" flexDirection="column" gap={0.5} flex={1}>
    <Typography fontWeight={600}>{label}</Typography>
    {children}
  </Box>
);
