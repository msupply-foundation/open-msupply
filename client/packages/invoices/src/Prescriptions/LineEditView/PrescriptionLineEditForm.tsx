import React, { useEffect, useState } from 'react';
import {
  Grid,
  BasicTextInput,
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
  TypedTFunction,
  LocaleKey,
  NumUtils,
  ItemNode,
  DropdownMenu,
  DropdownMenuItem,
  TextArea,
  InputWithLabelRow,
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
  allocatedUnits: number;
  availableUnits: number;
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
  allocatedUnits,
  onChangeItem,
  onChangeQuantity,
  item,
  packSizeController,
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
  const [issueUnitQuantity, setIssueUnitQuantity] = useState(0);
  const { format } = useFormatNumber();
  const { rows: items } = usePrescription();
  const [defaultDirection, setDefaultDirection] = useState<string>();
  const [abbreviation, setAbbreviation] = useState<string>();

  const debouncedSetAllocationAlerts = useDebounceCallback(
    warning => setAllocationAlerts(warning),
    []
  );

  const allocate = (numPacks: number, packSize: number) => {
    const newAllocateQuantities = onChangeQuantity(
      numPacks,
      packSize === -1 || packSize === 1 ? null : packSize,
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
      numPacks > allocatedQuantity && newAllocateQuantities !== undefined;
    const alerts = getAllocationAlerts(
      numPacks * (packSize === -1 ? 1 : packSize),
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
          requestedQuantity: format(numPacks),
        }),
        severity: 'warning',
      });
    }
    if (NumUtils.round(numPacks) !== numPacks) {
      const nearestAbove = Math.ceil(numPacks) * packSize;
      alerts.push({
        message: t('messages.partial-pack-warning', { nearestAbove }),
        severity: 'warning',
      });
    }
    debouncedSetAllocationAlerts(alerts);
    setIssueUnitQuantity(allocatedQuantity);
  };

  // using a debounced value for the allocation. In the scenario where
  // you have only pack sizes > 1 available, and try to type a quantity which starts with 1
  // e.g. 10, 12, 100.. then the allocation rounds the 1 up immediately to the available
  // pack size which stops you entering the required quantity.
  // See https://github.com/msupply-foundation/open-msupply/issues/2727
  // and https://github.com/msupply-foundation/open-msupply/issues/3532
  const debouncedAllocate = useDebouncedValueCallback(
    (numPacks, packSize) => {
      allocate(numPacks, packSize);
    },
    [],
    500,
    [draftPrescriptionLines] // this is needed to prevent a captured enclosure of onChangeQuantity
  );

  const handleIssueQuantityChange = (inputUnitQuantity?: number) => {
    // this method is also called onBlur... check that there actually has been a
    // change in quantity (to prevent triggering auto allocation if only focus
    // has moved)
    if (inputUnitQuantity === issueUnitQuantity) return;

    const quantity = inputUnitQuantity === undefined ? 0 : inputUnitQuantity;
    setIssueUnitQuantity(quantity);

    const packSize =
      packSizeController.selected?.value !== -1
        ? (packSizeController.selected?.value ?? 1)
        : 1;

    const numPacks = quantity / packSize;
    debouncedAllocate(numPacks, Number(packSize));
  };

  const prescriptionLineWithNote = draftPrescriptionLines.find(l => !!l.note);
  const note = prescriptionLineWithNote?.note ?? '';

  useEffect(() => {
    const newIssueQuantity = Math.round(
      allocatedUnits / Math.abs(Number(packSizeController.selected?.value || 1))
    );
    if (newIssueQuantity !== issueUnitQuantity)
      setIssueUnitQuantity(newIssueQuantity);
    setAllocationAlerts([]);
  }, [item?.id]);

  useEffect(() => {
    if (!isAutoAllocated) setIssueUnitQuantity(allocatedUnits);
  }, [packSizeController.selected?.value, allocatedUnits]);

  const key = item?.id ?? 'new';

  //MOCK DATA FOR TESTING
  interface Option {
    id: string;
    name: string;
    direction: string;
  }

  const options = [
    { id: '1', name: 'One', direction: '1 per day in the AM' },
    { id: '2', name: 'Two', direction: '2 per Day' },
    { id: '3', name: '3_5', direction: '3 1/2 per day' },
  ];
  const defaultDirections = ['1 per day', '2 per day', '3 per day'];

  //END OF MOCK DATA

  function handleAbbreviations(input: string, options: Option[]) {
    const output = input.split(' ');
    const matchedString = output.map(output => {
      const match = options.find(
        option => option.name.toLowerCase() === output.toLowerCase()
      );
      return match ? match.direction : output;
    });

    updateNotes(matchedString.join(' '));
    setAbbreviation('');
  }

  return (
    <Grid
      container
      gap="4px"
      sx={{ minHeight: 200, display: 'flex', flexDirection: 'column' }}
    >
      <AccordionPanelSection
        // Key ensures component will reload when switching item, but not when
        // making other changes within item (e.g. quantity)
        key={key + '_item_search'}
        title={t('label.item', { count: 1 })}
        closedSummary={item?.name}
        defaultExpanded={isNew && !disabled}
      >
        <Grid flex={1}>
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
          {!disabled && (
            <StockOutAlerts
              allocationAlerts={allocationAlerts}
              showZeroQuantityConfirmation={showZeroQuantityConfirmation}
              isAutoAllocated={isAutoAllocated}
            />
          )}
          <AccordionPanelSection
            title={t('label.quantity')}
            closedSummary={summarise(draftPrescriptionLines, t)}
            defaultExpanded={isNew && !disabled}
            key={key + '_quantity'}
          >
            <Grid
              container
              alignItems="center"
              display="flex"
              flexDirection="row"
              justifyContent="flex-start"
              gap={1}
            >
              <InputLabel style={{ fontSize: 12 }}>
                {t('label.issue')}
              </InputLabel>
              <NumericTextInput
                autoFocus
                disabled={disabled}
                value={issueUnitQuantity}
                onChange={handleIssueQuantityChange}
                min={0}
                decimalLimit={2}
              />
              <InputLabel style={{ fontSize: 12 }}>
                {t('label.unit-plural', {
                  count: issueUnitQuantity,
                  unit: item?.unitName,
                })}
              </InputLabel>
            </Grid>
            <TableWrapper
              canAutoAllocate={canAutoAllocate}
              currentItem={item}
              isLoading={isLoading}
              packSizeController={packSizeController}
              updateQuantity={updateQuantity}
              draftPrescriptionLines={draftPrescriptionLines}
              allocatedUnits={allocatedUnits}
              isDisabled={disabled}
            />
          </AccordionPanelSection>
        </>
      )}
      {item && (
        <AccordionPanelSection
          title={t('label.directions')}
          closedSummary={note}
          defaultExpanded={(isNew || !note) && !disabled}
          key={item?.id ?? 'new'}
        >
          <Grid container paddingBottom={1} gap={1} width={'100%'}>
            <InputWithLabelRow
              label={t('label.abbreviation')}
              Input={
                <BasicTextInput
                  value={abbreviation}
                  onChange={e => setAbbreviation(e.target.value)}
                  onBlur={e => {
                    handleAbbreviations(e.target.value, options);
                  }}
                />
              }
            />

            <DropdownMenu
              label={
                defaultDirection
                  ? defaultDirection
                  : t('placeholder.item-directions')
              }
            >
              {defaultDirections.map(direction => (
                <DropdownMenuItem
                  key={direction}
                  value={direction}
                  onClick={() => {
                    updateNotes(direction);
                    setDefaultDirection(direction);
                  }}
                  sx={{ fontSize: 14 }}
                >
                  {direction}
                </DropdownMenuItem>
              ))}
            </DropdownMenu>

            {/* <Select options={direction} /> */}
          </Grid>

          <Grid>
            <InputWithLabelRow
              label={t('label.directions')}
              Input={
                <TextArea
                  value={note}
                  onChange={e => {
                    updateNotes(e.target.value);
                  }}
                  fullWidth
                />
              }
            />
          </Grid>
        </AccordionPanelSection>
      )}
      {/* {!item && <Box height={100} />} */}
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
  allocatedUnits: number;
  isDisabled: boolean;
}

const TableWrapper: React.FC<TableProps> = ({
  canAutoAllocate,
  currentItem,
  isLoading,
  // packSizeController,
  updateQuantity,
  draftPrescriptionLines,
  allocatedUnits,
  isDisabled,
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
          // packSizeController={packSizeController}
          onChange={updateQuantity}
          rows={draftPrescriptionLines}
          item={currentItem}
          allocatedUnits={allocatedUnits}
          isDisabled={isDisabled}
        />
      </TableProvider>
    </>
  );
};

const summarise = (
  lines: DraftStockOutLine[],
  t: TypedTFunction<LocaleKey>
) => {
  // Count how many of each pack size
  const counts: Record<number, { unitName: string; count: number }> = {};
  lines.forEach(({ packSize, numberOfPacks, stockLine }) => {
    if (numberOfPacks === 0) return;
    if (counts[packSize]) {
      counts[packSize].count += packSize * numberOfPacks;
    } else {
      counts[packSize] = {
        unitName: (stockLine?.item as ItemNode)?.unitName ?? 'unit',
        count: NumUtils.round(packSize * numberOfPacks),
      };
    }
  });

  // Summarise counts in words
  const summary: string[] = [];
  Object.entries(counts).forEach(([size, { unitName, count }]) => {
    const unitWord = t('label.unit-plural', {
      count,
      unit: unitName,
    });
    if (Number(size) > 1) {
      const packs = NumUtils.round(count / Number(size), 3);
      summary.push(t('label.packs-of-size', { packs, count, size, unitWord }));
    } else {
      summary.push(t('label.packs-of-1', { count, unitWord }));
    }
  });

  return summary.join('\n');
};
