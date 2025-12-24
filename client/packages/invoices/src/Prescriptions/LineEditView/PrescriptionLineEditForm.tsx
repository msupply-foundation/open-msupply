import React, { useState } from 'react';
import {
  Grid,
  BasicTextInput,
  useTranslation,
  Typography,
  DropdownMenu,
  DropdownMenuItem,
  TextArea,
  InputWithLabelRow,
} from '@openmsupply-client/common';
import { AccordionPanelSection } from './PanelSection';
import { getPrescriptionDirections } from './getPrescriptionDirections';
import { useAbbreviations } from '../api/hooks/useAbbreviations';
import { AllocationSection } from './AllocationSection';
import {
  AutoAllocationAlerts,
  useAllocationContext,
  getAllocatedQuantity,
} from '../../StockOut';
import { useClosedSummary } from './hooks/useClosedSummary';

interface PrescriptionLineEditFormProps {
  disabled: boolean;
  isNew: boolean;
}

export const PrescriptionLineEditForm = ({
  disabled,
  isNew,
}: PrescriptionLineEditFormProps) => {
  const t = useTranslation();

  const { draftLines, item, note, allocatedQuantity, allocateInType, setNote } =
    useAllocationContext(state => ({
      draftLines: state.draftLines,
      item: state.item,
      note: state.note,
      setNote: state.setNote,
      allocatedQuantity: getAllocatedQuantity(state),
      allocateInType: state.allocateIn.type,
    }));

  const [defaultDirection, setDefaultDirection] = useState('');
  const [abbreviation, setAbbreviation] = useState('');

  const isDirectionsDisabled = !allocatedQuantity;

  const { data: options = [] } = useAbbreviations();
  const summarise = useClosedSummary();

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
          closedSummary={summarise(
            t,
            draftLines,
            allocateInType,
            item.unitName
          )}
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
            <AllocationSection
              disabled={disabled}
              hasLines={draftLines.length > 0}
            />
          </Grid>
        </AccordionPanelSection>
        <AccordionPanelSection
          title={t('label.directions')}
          closedSummary={[{ text: isDirectionsDisabled ? '' : (note ?? '') }]}
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
                      disabled={disabled}
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
                      disabled={disabled}
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
