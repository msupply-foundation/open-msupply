import React, { useEffect, useState } from 'react';
import {
  Grid,
  BasicTextInput,
  ModalLabel,
  Select,
  useTranslation,
  NumericTextInput,
  Box,
  Typography,
  useFormatNumber,
  useDebounceCallback,
  InputLabel,
  useDebouncedValueCallback,
  TableProvider,
  createTableStore,
  createQueryParamsStore,
  InlineSpinner,
} from '@openmsupply-client/common';
import {
  StockItemSearchInput,
  ItemRowFragment,
} from '@openmsupply-client/system';
import { usePrescription } from '../api';
import { PackSizeController } from '../../StockOut';
import {
  StockOutAlert,
  StockOutAlerts,
  getAllocationAlerts,
} from '../../StockOut';
import { DraftStockOutLine } from '../../types';
import { isA } from '../../utils';
import { AccordionPanelSection } from './PanelSection';
import { PrescriptionLineEditTable } from './PrescriptionLineEditTable';

interface PrescriptionLineEditFormProps {
  allocatedQuantity: number;
  availableQuantity: number;
  item: ItemRowFragment | null;
  onChangeItem: (newItem: ItemRowFragment | null) => void;
  onChangeQuantity: (
    quantity: number,
    packSize: number | null,
    isAutoAllocated: boolean
  ) => DraftStockOutLine[] | undefined;
  packSizeController: PackSizeController;
  disabled: boolean;
  isNew: boolean;
  canAutoAllocate: boolean;
  isAutoAllocated: boolean;
  updateNotes: (note: string) => void;
  draftPrescriptionLines: DraftStockOutLine[];
  showZeroQuantityConfirmation: boolean;
  hasOnHold: boolean;
  hasExpired: boolean;
  isLoading: boolean;
  updateQuantity: (batchId: string, updateQuantity: number) => void;
}

export const PrescriptionLineEditForm: React.FC<
  PrescriptionLineEditFormProps
> = ({
  allocatedQuantity,
  onChangeItem,
  onChangeQuantity,
  item,
  packSizeController,
  availableQuantity,
  disabled,
  isNew,
  canAutoAllocate,
  updateNotes,
  draftPrescriptionLines,
  showZeroQuantityConfirmation,
  isAutoAllocated,
  hasOnHold,
  hasExpired,
  isLoading,
  updateQuantity,
}) => {
  const t = useTranslation();
  const [allocationAlerts, setAllocationAlerts] = useState<StockOutAlert[]>([]);
  const [issueQuantity, setIssueQuantity] = useState(0);
  const { format } = useFormatNumber();
  const { rows: items } = usePrescription();

  const onChangePackSize = (newPackSize: number) => {
    const packSize = newPackSize === -1 ? 1 : newPackSize;
    const newAllocatedQuantity =
      newPackSize === 0 ? 0 : Math.round(allocatedQuantity / packSize);

    packSizeController.setPackSize(newPackSize);
    allocate(newAllocatedQuantity, newPackSize);
  };

  const updateIssueQuantity = (quantity: number) => {
    setIssueQuantity(
      Math.round(
        quantity / Math.abs(Number(packSizeController.selected?.value || 1))
      )
    );
  };

  const debouncedSetAllocationAlerts = useDebounceCallback(
    warning => setAllocationAlerts(warning),
    []
  );

  const allocate = (quantity: number, packSize: number) => {
    const newAllocateQuantities = onChangeQuantity(
      quantity,
      packSize === -1 ? null : packSize,
      true
    );
    const placeholderLine = newAllocateQuantities?.find(isA.placeholderLine);
    const allocatedQuantity =
      newAllocateQuantities?.reduce(
        (acc, { numberOfPacks, packSize }) => acc + numberOfPacks * packSize,
        0
      ) ?? 0;
    const allocateInUnits = packSize === null;
    const messageKey = allocateInUnits
      ? 'warning.cannot-create-placeholder-units'
      : 'warning.cannot-create-placeholder-packs';
    const hasRequestedOverAvailable =
      quantity > allocatedQuantity && newAllocateQuantities !== undefined;
    const alerts = getAllocationAlerts(
      quantity * (packSize === -1 ? 1 : packSize),
      // suppress the allocation warning if the user has requested more than the available amount of stock
      hasRequestedOverAvailable ? 0 : allocatedQuantity,
      placeholderLine?.numberOfPacks ?? 0,
      hasOnHold,
      hasExpired,
      format,
      t
    );
    if (hasRequestedOverAvailable) {
      alerts.push({
        message: t(messageKey, {
          allocatedQuantity: format(allocatedQuantity),
          requestedQuantity: format(quantity),
        }),
        severity: 'warning',
      });
    }
    debouncedSetAllocationAlerts(alerts);
    updateIssueQuantity(allocatedQuantity);
  };

  // using a debounced value for the allocation. In the scenario where
  // you have only pack sizes > 1 available, and try to type a quantity which starts with 1
  // e.g. 10, 12, 100.. then the allocation rounds the 1 up immediately to the available
  // pack size which stops you entering the required quantity.
  // See https://github.com/msupply-foundation/open-msupply/issues/2727
  // and https://github.com/msupply-foundation/open-msupply/issues/3532
  const debouncedAllocate = useDebouncedValueCallback(
    (quantity, packSize) => {
      allocate(quantity, packSize);
    },
    [],
    500,
    [draftPrescriptionLines] // this is needed to prevent a captured enclosure of onChangeQuantity
  );

  const handleIssueQuantityChange = (inputQuantity?: number) => {
    // this method is also called onBlur... check that there actually has been a change
    // in quantity (to prevent triggering auto allocation if only focus has moved)
    if (inputQuantity === issueQuantity) return;

    const quantity = inputQuantity === undefined ? 0 : inputQuantity;
    setIssueQuantity(quantity);
    debouncedAllocate(quantity, Number(packSizeController.selected?.value));
  };

  const prescriptionLineWithNote = draftPrescriptionLines.find(l => !!l.note);
  const note = prescriptionLineWithNote?.note ?? '';

  useEffect(() => {
    const newIssueQuantity = Math.round(
      allocatedQuantity /
        Math.abs(Number(packSizeController.selected?.value || 1))
    );
    if (newIssueQuantity !== issueQuantity) setIssueQuantity(newIssueQuantity);
  }, [item?.id]);

  useEffect(() => {
    if (!isAutoAllocated) updateIssueQuantity(allocatedQuantity);
  }, [packSizeController.selected?.value, allocatedQuantity]);

  return (
    <Grid container gap="4px">
      <AccordionPanelSection
        title={t('label.item', { count: 1 })}
        closedSummary={item?.name}
      >
        <Grid item flex={1}>
          <StockItemSearchInput
            autoFocus={!item}
            openOnFocus={!item}
            disabled={!isNew || disabled}
            currentItemId={item?.id}
            onChange={onChangeItem}
            includeNonVisibleWithStockOnHand
            extraFilter={
              disabled
                ? undefined
                : item => !items?.some(({ id }) => id === item.id)
            }
          />
        </Grid>
      </AccordionPanelSection>
      {item && (
        <>
          <AccordionPanelSection
            title="Quantity"
            closedSummary={t('label.available-quantity', {
              number: availableQuantity.toFixed(0),
            })}
          >
            <Grid item display="flex">
              <Typography>
                {t('label.available-quantity', {
                  number: availableQuantity.toFixed(0),
                })}
              </Typography>
            </Grid>
            <Grid
              style={{ display: 'flex' }}
              justifyContent="flex-end"
              flex={1}
            >
              <ModalLabel label={t('label.unit')} justifyContent="flex-end" />
              <BasicTextInput
                disabled
                sx={{ width: 150 }}
                value={item?.unitName}
              />
            </Grid>
          </AccordionPanelSection>
        </>
      )}
      {item && canAutoAllocate ? (
        <>
          <AccordionPanelSection title={t('label.directions')}>
            <BasicTextInput
              value={note}
              disabled={disabled}
              onChange={e => {
                updateNotes(e.target.value);
              }}
              InputProps={{
                sx: {
                  // backgroundColor: theme => theme.palette.background.menu,
                },
              }}
              fullWidth
              style={{ flex: 1 }}
            />
          </AccordionPanelSection>
          {!disabled && (
            <StockOutAlerts
              allocationAlerts={allocationAlerts}
              showZeroQuantityConfirmation={showZeroQuantityConfirmation}
              isAutoAllocated={isAutoAllocated}
            />
          )}
          <AccordionPanelSection title={t('label.quantity')}>
            <Grid container>
              <ModalLabel label={t('label.issue')} />
              <NumericTextInput
                autoFocus
                disabled={disabled}
                value={issueQuantity}
                onChange={handleIssueQuantityChange}
                min={0}
              />
              {packSizeController.options.length ? (
                <>
                  <Grid
                    item
                    alignItems="center"
                    display="flex"
                    justifyContent="flex-start"
                    style={{ minWidth: 125 }}
                  >
                    <InputLabel sx={{ fontSize: '12px' }}>
                      {packSizeController.selected?.value === -1
                        ? `${t('label.unit-plural', {
                            unit: item?.unitName,
                            count: issueQuantity,
                          })} ${t('label.in-packs-of')}`
                        : t('label.in-packs-of')}
                    </InputLabel>
                  </Grid>
                  <Select
                    sx={{ width: 110 }}
                    disabled={disabled}
                    options={packSizeController.options}
                    value={packSizeController.selected?.value ?? ''}
                    onChange={e => {
                      const { value } = e.target;
                      onChangePackSize(Number(value));
                    }}
                  />
                  {packSizeController.selected?.value !== -1 && (
                    <Grid
                      item
                      alignItems="center"
                      display="flex"
                      justifyContent="flex-start"
                    >
                      <InputLabel style={{ fontSize: 12, marginLeft: 8 }}>
                        {t('label.unit-plural', {
                          count: packSizeController.selected?.value,
                          unit: item?.unitName,
                        })}
                      </InputLabel>
                    </Grid>
                  )}
                </>
              ) : null}
            </Grid>
            <TableWrapper
              canAutoAllocate={canAutoAllocate}
              currentItem={item}
              isLoading={isLoading}
              packSizeController={packSizeController}
              updateQuantity={updateQuantity}
              draftPrescriptionLines={draftPrescriptionLines}
              allocatedQuantity={allocatedQuantity}
            />
          </AccordionPanelSection>
        </>
      ) : (
        <Box height={100} />
      )}
    </Grid>
  );
};

interface TableProps {
  canAutoAllocate: boolean;
  currentItem: ItemRowFragment | null;
  isLoading: boolean;
  packSizeController: PackSizeController;
  updateQuantity: (batchId: string, updateQuantity: number) => void;
  draftPrescriptionLines: DraftStockOutLine[];
  allocatedQuantity: number;
}

const TableWrapper: React.FC<TableProps> = ({
  canAutoAllocate,
  currentItem,
  isLoading,
  packSizeController,
  updateQuantity,
  draftPrescriptionLines,
  allocatedQuantity,
}) => {
  const t = useTranslation();

  if (!currentItem) return null;

  if (isLoading)
    return (
      <Box
        display="flex"
        flex={1}
        height={400}
        justifyContent="center"
        alignItems="center"
      >
        <InlineSpinner />
      </Box>
    );

  if (!canAutoAllocate)
    return (
      <Box sx={{ margin: 'auto' }}>
        <Typography>{t('messages.no-stock-available')}</Typography>
      </Box>
    );

  return (
    <>
      <TableProvider
        createStore={createTableStore}
        queryParamsStore={createQueryParamsStore({
          initialSortBy: { key: 'expiryDate' },
        })}
      >
        <PrescriptionLineEditTable
          packSizeController={packSizeController}
          onChange={updateQuantity}
          rows={draftPrescriptionLines}
          item={currentItem}
          allocatedQuantity={allocatedQuantity}
        />
      </TableProvider>
    </>
  );
};
