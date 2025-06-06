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
import { AccordionPanelSection } from './PanelSection';
import { getPrescriptionDirections } from './getPrescriptionDirections';
import { useAbbreviations } from '../api/hooks/useAbbreviations';
import { AllocationSection } from './AllocationSection';
import {
  AutoAllocationAlerts,
  DraftStockOutLineFragment,
  useAllocationContext,
  getAllocatedQuantity,
} from '../../StockOut';

interface PrescriptionLineEditFormProps {
  disabled: boolean;
  isNew: boolean;
}

export const PrescriptionLineEditForm = ({
  disabled,
  isNew,
}: PrescriptionLineEditFormProps) => {
  const t = useTranslation();
  const { getPlural } = useIntlUtils();
  const { data: prefs } = usePreference(
    PreferenceKey.ManageVaccinesInDoses,
    PreferenceKey.SortByVvmStatusThenExpiry
  );

  const { draftLines, item, note, allocatedQuantity, setNote } =
    useAllocationContext(state => ({
      draftLines: state.draftLines,
      item: state.item,
      note: state.note,
      setNote: state.setNote,
      allocatedQuantity: getAllocatedQuantity(state),
    }));

  const [defaultDirection, setDefaultDirection] = useState('');
  const [abbreviation, setAbbreviation] = useState('');

  const isDirectionsDisabled = !allocatedQuantity;
  const displayInDoses = !!prefs?.manageVaccinesInDoses && !!item?.isVaccine;

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
    item && (
      <>
        {!disabled && <AutoAllocationAlerts />}

        <AccordionPanelSection
          title={t('label.quantity')}
          closedSummary={
            displayInDoses
              ? dosesSummary(t, draftLines)
              : summarise(
                  t,
                  item.unitName ?? t('label.unit'),
                  draftLines,
                  getPlural
                )
          }
          defaultExpanded={isNew && !disabled}
        >
          <Grid
            container
            alignItems="center"
            display="flex"
            flexDirection="row"
            gap={5}
            paddingBottom={2}
          >
            <AllocationSection disabled={disabled} />
          </Grid>
        </AccordionPanelSection>
        <AccordionPanelSection
          title={t('label.directions')}
          closedSummary={isDirectionsDisabled ? '' : (note ?? '')}
          defaultExpanded={(isNew || !note) && !disabled}
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
      </>
    )
  );
};

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

  const roundedDoses = NumUtils.round(totalDoses);

  const unitWord = t('label.doses-plural', {
    count: roundedDoses,
  });

  return `${roundedDoses} ${unitWord}`;
};
