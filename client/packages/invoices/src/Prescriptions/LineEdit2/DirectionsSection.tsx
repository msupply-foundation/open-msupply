import React, { useState } from 'react';
import { AccordionPanelSection } from './toBeCommon/PanelSection';
import { useTranslation } from '@common/intl';
import { DraftPrescriptionLine } from '../../types';
import {
  BasicTextInput,
  DropdownMenu,
  DropdownMenuItem,
  Grid,
  InputWithLabelRow,
  TextArea,
} from '@openmsupply-client/common';
import { ItemDirectionFragment } from '../api';
import { getPrescriptionDirections } from './getPrescriptionDirections';
import { useAbbreviations } from '../api/hooks/useAbbreviations';

interface DirectionsSectionProps {
  disabled: boolean;
  isNew: boolean;
  itemId: string;
  prescriptionLines: DraftPrescriptionLine[];
  itemDirections: ItemDirectionFragment[];
  updateNote: (note: string) => void;
}

export const DirectionsSection = ({
  disabled,
  isNew,
  itemId,
  prescriptionLines,
  itemDirections,
  updateNote,
}: DirectionsSectionProps) => {
  const t = useTranslation();

  const [defaultDirection, setDefaultDirection] = useState('');
  const [abbreviation, setAbbreviation] = useState('');

  const prescriptionLineWithNote = prescriptionLines.find(l => !!l.note);
  const note = prescriptionLineWithNote?.note ?? '';

  const { data: options = [] } = useAbbreviations();

  const saveAbbreviation = () => {
    if (!abbreviation) return;
    const note = getPrescriptionDirections(abbreviation, options);
    updateNote(note);
    setDefaultDirection('');
  };

  const saveDefaultDirection = (direction: string) => {
    if (!direction) return;
    setDefaultDirection(direction);
    const note = getPrescriptionDirections(direction, options);
    updateNote(note);
    setAbbreviation('');
  };

  return (
    <>
      <AccordionPanelSection
        title={t('label.directions')}
        closedSummary={note}
        defaultExpanded={(isNew || !note) && !disabled}
        key={itemId + '_directions'}
      >
        <Grid container paddingBottom={1} gap={1} width={'100%'}>
          <InputWithLabelRow
            label={t('label.abbreviation')}
            Input={
              <BasicTextInput
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
            disabled={disabled}
          >
            {itemDirections.length == 0 ? (
              <DropdownMenuItem sx={{ fontSize: 14 }}>
                {t('message.no-directions')}
              </DropdownMenuItem>
            ) : (
              itemDirections
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
                disabled={disabled}
                onChange={e => {
                  updateNote(e.target.value);
                  setAbbreviation('');
                  setDefaultDirection('');
                }}
                style={{ flex: 1 }}
              />
            }
          />
        </Grid>
      </AccordionPanelSection>
    </>
  );
};
