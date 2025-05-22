import React, { useEffect, useState } from 'react';
import {
  Grid,
  BasicTextInput,
  useTranslation,
  Typography,
  TypedTFunction,
  LocaleKey,
  NumUtils,
  ItemNode,
  DropdownMenu,
  DropdownMenuItem,
  TextArea,
  InputWithLabelRow,
  useIntlUtils,
  usePreference,
  PreferenceKey,
} from '@openmsupply-client/common';
import {
  StockItemSearchInput,
  ItemRowWithDirectionsFragment,
} from '@openmsupply-client/system';
import { usePrescription } from '../api';
import { PackSizeController } from '../../StockOut';
import { StockOutAlert, StockOutAlerts } from '../../StockOut';
import { DraftPrescriptionLine } from '../../types';
import { AccordionPanelSection } from './PanelSection';
import { getPrescriptionDirections } from './getPrescriptionDirections';
import { useAbbreviations } from '../api/hooks/useAbbreviations';
import { AllocationSection } from './AllocationSection';
import { AutoAllocationAlerts } from '../../Allocation/AutoAllocationAlerts';

interface PrescriptionLineEditFormProps {
  allocatedUnits: number;
  availableUnits: number;
  item: ItemRowWithDirectionsFragment | null;
  onChangeItem: (newItem: ItemRowWithDirectionsFragment | null) => void;
  packSizeController: PackSizeController;
  disabled: boolean;
  isNew: boolean;
  updateNotes: (note: string) => void;
  draftPrescriptionLines: DraftPrescriptionLine[];
  showZeroQuantityConfirmation: boolean;
  hasOnHold: boolean;
  hasExpired: boolean;
  isLoading: boolean;
  programId?: string;
  invoiceId: string;
}

export const PrescriptionLineEditForm: React.FC<
  PrescriptionLineEditFormProps
> = ({
  // allocatedUnits,
  onChangeItem,
  item,
  // packSizeController,
  disabled,
  isNew,
  updateNotes,
  draftPrescriptionLines,
  // showZeroQuantityConfirmation,
  programId,
  invoiceId,
}) => {
  const t = useTranslation();
  const { getPlural } = useIntlUtils();
  const { rows: items } = usePrescription();
  const { data: prefs } = usePreference(
    PreferenceKey.DisplayVaccinesInDoses,
    PreferenceKey.SortByVvmStatusThenExpiry
  );

  // const [allocationAlerts, setAllocationAlerts] = useState<StockOutAlert[]>([]);
  const [defaultDirection, setDefaultDirection] = useState<string>('');
  const [abbreviation, setAbbreviation] = useState<string>('');

  const isDirectionsDisabled = true; //!issueUnitQuantity;
  const displayInDoses = !!prefs?.displayVaccinesInDoses && !!item?.isVaccine;

  const prescriptionLineWithNote = draftPrescriptionLines.find(l => !!l.note);
  const note = prescriptionLineWithNote?.note ?? '';

  useEffect(() => {
    // TODO: CHeck this is managed by allocation context

    setAbbreviation('');
    setDefaultDirection('');
  }, [item?.id]);

  // useEffect(() => {
  //   setIssueUnitQuantity(allocatedUnits);
  // }, [allocatedUnits]);

  const key = item?.id ?? 'new';

  const { data: options = [] } = useAbbreviations();

  const saveAbbreviation = () => {
    if (!abbreviation) return;
    const note = getPrescriptionDirections(abbreviation, options);
    updateNotes(note);
    setDefaultDirection('');
  };

  const saveDefaultDirection = (direction: string) => {
    if (!direction) return;
    setDefaultDirection(direction);
    const note = getPrescriptionDirections(direction, options);
    updateNotes(note);
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
            autoFocus={!item}
            openOnFocus={!item}
            disabled={!isNew || disabled}
            currentItemId={item?.id}
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
      {item && (
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
                ? dosesSummary(t, draftPrescriptionLines)
                : summarise(t, draftPrescriptionLines, getPlural)
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
                itemId={item?.id ?? ''}
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
      {item && (
        <AccordionPanelSection
          title={t('label.directions')}
          closedSummary={isDirectionsDisabled ? '' : note}
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
                  {item.itemDirections.length == 0 ? (
                    <DropdownMenuItem sx={{ fontSize: 14 }}>
                      {t('message.no-directions')}
                    </DropdownMenuItem>
                  ) : (
                    item.itemDirections
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
                        updateNotes(e.target.value);
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
  lines: DraftPrescriptionLine[],
  getPlural: (word: string, count: number) => string
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
  lines: DraftPrescriptionLine[]
) => {
  const totalDoses = lines.reduce(
    (sum, { packSize, numberOfPacks, item, itemVariant }) =>
      sum +
      packSize * numberOfPacks * (itemVariant?.dosesPerUnit ?? item.doses),
    0
  );

  const unitWord = t('label.doses-plural', {
    count: NumUtils.round(totalDoses),
  });

  return `${totalDoses} ${unitWord}`;
};
