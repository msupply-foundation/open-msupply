import React, { useState } from 'react';
import {
  Grid,
  BasicTextInput,
  useTranslation,
  Typography,
  TypedTFunction,
  LocaleKey,
  NumUtils,
  DropdownMenu,
  DropdownMenuItem,
  TextArea,
  InputWithLabelRow,
  useIntlUtils,
  usePreference,
  PreferenceKey,
} from '@openmsupply-client/common';
import {
  ItemRowWithDirectionsFragment,
  StockItemSearchInput,
} from '@openmsupply-client/system';
import { usePrescription } from '../api';
import { AccordionPanelSection } from './PanelSection';
import { getPrescriptionDirections } from './getPrescriptionDirections';
import { useAbbreviations } from '../api/hooks/useAbbreviations';
import { AllocationSection } from './AllocationSection';
import { AutoAllocationAlerts } from '../../Allocation/AutoAllocationAlerts';
import { DraftStockOutLineFragment } from '../../OutboundShipment/api/operations.generated';
import { useAllocationContext } from '../../Allocation/useAllocationContext';

interface PrescriptionLineEditFormProps {
  item: ItemRowWithDirectionsFragment | null;
  onChangeItem: (newItem: ItemRowWithDirectionsFragment | null) => void;
  disabled: boolean;
  isNew: boolean;
  programId?: string;
  invoiceId: string;
}

export const PrescriptionLineEditForm = ({
  // tODO: consolidate with item in useAllocationContext
  item: prescriptionItem,
  disabled,
  isNew,
  programId,
  invoiceId,
  onChangeItem,
}: PrescriptionLineEditFormProps) => {
  const t = useTranslation();
  const { getPlural } = useIntlUtils();
  const { rows: items } = usePrescription();
  const { data: prefs } = usePreference(
    PreferenceKey.DisplayVaccinesInDoses,
    PreferenceKey.SortByVvmStatusThenExpiry
  );

  const { draftLines, item, note, setNote } = useAllocationContext(
    ({ draftLines, item, note, setNote }) => ({
      draftLines,
      item,
      note,
      setNote,
    })
  );

  // TODO - ensure key change, this should clear
  const [defaultDirection, setDefaultDirection] = useState<string>('');
  const [abbreviation, setAbbreviation] = useState<string>('');

  const isDirectionsDisabled = true; // !issueUnitQuantity;
  const displayInDoses = !!prefs?.displayVaccinesInDoses && !!item?.isVaccine;

  const key = prescriptionItem?.id ?? 'new';

  const { data: options = [] } = useAbbreviations();

  const saveAbbreviation = () => {
    if (!abbreviation) return;
    const note = getPrescriptionDirections(abbreviation, options);
    setNote(note);
    setDefaultDirection('');
  };

  const saveDefaultDirection = (direction: string) => {
    if (!direction) return;
    setDefaultDirection(direction);
    const note = getPrescriptionDirections(direction, options);
    setNote(note);
    setAbbreviation('');
  };

  const abbreviationRef = React.useRef<HTMLInputElement>(null);

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
            autoFocus={!prescriptionItem}
            openOnFocus={!prescriptionItem}
            disabled={!isNew || disabled}
            currentItemId={prescriptionItem?.id}
            onChange={onChangeItem}
            filter={{ isVisibleOrOnHand: true }}
            extraFilter={
              disabled
                ? undefined
                : item => !items?.some(({ id }) => id === item.id)
            }
            programId={programId}
          />
        </Grid>
      </AccordionPanelSection>
      {prescriptionItem && (
        <>
          {!disabled && (
            <AutoAllocationAlerts />
            // TODO: Impl Allocation Alerts for Prescriptions
            // <StockOutAlerts
            //   allocationAlerts={allocationAlerts}
            //   showZeroQuantityConfirmation={showZeroQuantityConfirmation}
            //   isAutoAllocated={isAutoAllocated}
            // />
          )}
          <AccordionPanelSection
            title={t('label.quantity')}
            closedSummary={
              displayInDoses
                ? dosesSummary(t, draftLines)
                : summarise(
                    t,
                    prescriptionItem.unitName ?? t('label.unit'),
                    draftLines,
                    getPlural
                  )
            }
            defaultExpanded={isNew && !disabled}
            key={key + '_quantity'}
          >
            <Grid
              container
              alignItems="center"
              display="flex"
              flexDirection="row"
              gap={5}
              paddingBottom={2}
            >
              <AllocationSection
                itemId={prescriptionItem?.id ?? ''}
                invoiceId={invoiceId}
                disabled={disabled}
                prefOptions={{
                  allocateVaccineItemsInDoses:
                    prefs?.displayVaccinesInDoses ?? false,
                  sortByVvmStatus: prefs?.sortByVvmStatusThenExpiry ?? false,
                }}
              />
            </Grid>
          </AccordionPanelSection>
        </>
      )}
      {item && prescriptionItem && (
        <AccordionPanelSection
          title={t('label.directions')}
          closedSummary={isDirectionsDisabled ? '' : (note ?? '')}
          defaultExpanded={(isNew || !note) && !disabled}
          key={item?.id ?? 'new'}
        >
          {isDirectionsDisabled ? (
            <Typography>{t('messages.cannot-add-directions')}</Typography>
          ) : (
            <>
              <Grid container paddingBottom={1} gap={1} width={'100%'}>
                <InputWithLabelRow
                  label={t('label.abbreviation')}
                  Input={
                    <BasicTextInput
                      inputRef={abbreviationRef}
                      value={abbreviation}
                      onChange={e => {
                        setAbbreviation(e.target.value);
                      }}
                      onBlur={saveAbbreviation}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          saveAbbreviation();
                        }
                      }}
                      style={{ flex: 1 }}
                    />
                  }
                />
                <DropdownMenu
                  sx={{ flex: 1 }}
                  selectSx={{ width: '100%' }}
                  label={
                    defaultDirection
                      ? defaultDirection
                      : t('placeholder.item-directions')
                  }
                >
                  {prescriptionItem.itemDirections.length == 0 ? (
                    <DropdownMenuItem sx={{ fontSize: 14 }}>
                      {t('message.no-directions')}
                    </DropdownMenuItem>
                  ) : (
                    prescriptionItem.itemDirections
                      .sort((a, b) => a.priority - b.priority)
                      .map(
                        direction =>
                          direction && (
                            <DropdownMenuItem
                              key={direction.id}
                              value={defaultDirection}
                              onClick={() => {
                                saveDefaultDirection(direction.directions);
                              }}
                              sx={{ fontSize: 14 }}
                            >
                              {direction.directions}
                            </DropdownMenuItem>
                          )
                      )
                  )}
                </DropdownMenu>
              </Grid>
              <Grid>
                <InputWithLabelRow
                  label={t('label.directions')}
                  Input={
                    <TextArea
                      value={note}
                      onChange={e => {
                        setNote(e.target.value);
                        setAbbreviation('');
                        setDefaultDirection('');
                      }}
                      style={{ flex: 1 }}
                    />
                  }
                />
              </Grid>
            </>
          )}
        </AccordionPanelSection>
      )}
    </Grid>
  );
};

// TODO: Change these to use Allocation Context
const summarise = (
  t: TypedTFunction<LocaleKey>,
  unitName: string,
  lines: DraftStockOutLineFragment[],
  getPlural: (word: string, count: number) => string
) => {
  // Count how many of each pack size
  const counts: Record<number, { unitName: string; count: number }> = {};
  lines.forEach(({ packSize, numberOfPacks }) => {
    if (numberOfPacks === 0) return;
    if (counts[packSize]) {
      counts[packSize].count += packSize * numberOfPacks;
    } else {
      counts[packSize] = {
        unitName,
        count: NumUtils.round(packSize * numberOfPacks, 2),
      };
    }
  });

  // Summarise counts in words
  const summary: string[] = [];
  Object.entries(counts).forEach(([size, { unitName, count: numUnits }]) => {
    const packSize = Number(size);
    if (packSize > 1) {
      const numPacks = NumUtils.round(numUnits / packSize, 3);
      const packWord = t('label.packs-of', { count: numPacks }); // pack or packs
      const unitWord = t('label.units-plural', { count: numUnits }); // unit or units
      const unitType = getPlural(unitName, packSize);
      summary.push(
        t('label.packs-of-size', {
          numPacks,
          numUnits,
          packSize,
          unitType,
          packWord,
          unitWord,
        })
      );
    } else {
      const unitType = getPlural(unitName, numUnits);
      summary.push(t('label.packs-of-1', { numUnits, unitType }));
    }
  });

  return summary.join('\n');
};

const dosesSummary = (
  t: TypedTFunction<LocaleKey>,
  lines: DraftStockOutLineFragment[]
) => {
  const totalDoses = lines.reduce(
    (sum, { packSize, numberOfPacks, defaultDosesPerUnit, itemVariant }) =>
      sum +
      packSize *
        numberOfPacks *
        (itemVariant?.dosesPerUnit ?? defaultDosesPerUnit),
    0
  );

  const unitWord = t('label.doses-plural', {
    count: NumUtils.round(totalDoses),
  });

  return `${totalDoses} ${unitWord}`;
};
