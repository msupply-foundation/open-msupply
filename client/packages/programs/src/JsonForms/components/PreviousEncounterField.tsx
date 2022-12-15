import React from 'react';
import { ControlProps, rankWith, uiTypeIs } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import {
  Box,
  DetailInputWithLabelRow,
  NumericTextInput,
} from '@openmsupply-client/common';
import {
  FORM_LABEL_COLUMN_WIDTH,
  FORM_INPUT_COLUMN_WIDTH,
  FORM_LABEL_WIDTH,
} from '../common';
import { useEncounter } from '../../api';
import { get as extractProperty } from 'lodash';
import { FormLabel } from '@mui/material';

export const previousEncounterFieldTester = rankWith(
  10,
  uiTypeIs('PreviousEncounterField')
);

const UIComponent = (props: ControlProps) => {
  const { label, path, schema } = props;

  // fetch current encounter
  const encounterId = useEncounter.utils.idFromUrl();
  const { data: currentEncounter } = useEncounter.document.byId(encounterId);

  // fetch previous encounter
  const { data: previousEncounter } = useEncounter.document.previous(
    currentEncounter?.patient.id,
    currentEncounter?.startDatetime
      ? new Date(currentEncounter?.startDatetime)
      : new Date()
  );

  if (!props.visible) {
    return null;
  }

  const inputProps = {
    value: previousEncounter
      ? extractProperty(previousEncounter.document.data, path)
      : '',
    disabled: true,
    sx: {},
    required: props.required,
  };

  return schema.type === 'string' ? (
    <DetailInputWithLabelRow
      label={label}
      inputProps={{
        ...inputProps,
        sx: { ...inputProps.sx, margin: 0.5, width: '100%' },
      }}
      labelWidthPercentage={FORM_LABEL_WIDTH}
      inputAlignment={'start'}
    />
  ) : (
    <Box
      display="flex"
      alignItems="center"
      gap={2}
      justifyContent="space-around"
      style={{ minWidth: 300 }}
      marginTop={1}
    >
      <Box style={{ textAlign: 'end' }} flexBasis={FORM_LABEL_COLUMN_WIDTH}>
        <FormLabel sx={{ fontWeight: 'bold' }}>{label}:</FormLabel>
      </Box>
      <Box flexBasis={FORM_INPUT_COLUMN_WIDTH}>
        <NumericTextInput {...inputProps} />
      </Box>
    </Box>
  );
};

/**
 * Shows a field from the previous encounter
 */
export const PreviousEncounterField = withJsonFormsControlProps(UIComponent);
