import React from 'react';
import {
  Box,
  Typography,
  InputWithLabelRow,
  NothingHere,
  PropertyV2Input,
  useIsExtraSmallScreen,
  useTranslation,
} from '@openmsupply-client/common';
import { PropertyV2Fragment } from '../../api/operations.generated';
import { DraftProperties } from './useDraftPatientProperties';

interface PatientCustomPropertiesProps {
  definitions: PropertyV2Fragment[];
  draftProperties: DraftProperties;
  updateProperty: (update: DraftProperties) => void;
  disabled: boolean;
}

/**
 * Editable list of a patient's custom properties. Joins the patient-scoped
 * propertyV2 definitions against the draft values and renders an input per
 * definition (all definitions, so empty fields are fillable), sorted by name.
 *
 * Each control is the shared {@link PropertyV2Input} in its editable mode
 * (`onChange` supplied): TEXT/INTEGER/REAL/DATE render their native inputs,
 * BOOLEAN a checkbox, and OPTION (the name categories) an id-aware autocomplete
 * of leaf options. Value types the shared control doesn't recognise fall back to
 * a read-only display.
 */
export const PatientCustomProperties = ({
  definitions,
  draftProperties,
  updateProperty,
  disabled,
}: PatientCustomPropertiesProps) => {
  const t = useTranslation();
  const isExtraSmallScreen = useIsExtraSmallScreen();

  if (!definitions.length) {
    return <NothingHere body={t('messages.no-properties')} />;
  }

  return (
    <Box
      sx={theme => ({
        [theme.breakpoints.down('sm')]: {
          width: '95%',
          minWidth: '340px',
          paddingX: '2em',
        },
        width: '600px',
        display: 'grid',
        gap: 1,
        margin: '0 auto',
        paddingTop: 2,
      })}
    >
      {[...definitions]
        .sort((a, b) => (a.name || a.key).localeCompare(b.name || b.key))
        .map(definition => (
          <Row
            key={definition.id}
            label={definition.name || definition.key}
            isExtraSmallScreen={isExtraSmallScreen}
            input={
              <PropertyV2Input
                definition={definition}
                value={draftProperties[definition.key] ?? null}
                disabled={disabled}
                onChange={v => updateProperty({ [definition.key]: v ?? null })}
              />
            }
          />
        ))}
    </Box>
  );
};

const Row = ({
  label,
  isExtraSmallScreen,
  input,
}: {
  label: string;
  isExtraSmallScreen: boolean;
  input: React.ReactNode;
}) => {
  if (!isExtraSmallScreen)
    return (
      <InputWithLabelRow
        label={label}
        sx={{ width: '100%' }}
        labelProps={{
          sx: { width: '250px', fontSize: '16px', paddingRight: 2 },
        }}
        Input={<Box flex={1}>{input}</Box>}
      />
    );

  return (
    <Box paddingTop={1.5}>
      <Typography sx={{ fontSize: '1rem!important', fontWeight: 'bold' }}>
        {label}
      </Typography>
      {input}
    </Box>
  );
};
