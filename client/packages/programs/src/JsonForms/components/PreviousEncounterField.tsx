import React from 'react';
import { ControlProps, rankWith, uiTypeIs } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import {
  Box,
  DetailInputWithLabelRow,
  NumericTextInput,
  FormLabel,
  labelWithPunctuation,
} from '@openmsupply-client/common';
import {
  FORM_LABEL_COLUMN_WIDTH,
  FORM_INPUT_COLUMN_WIDTH,
  FORM_LABEL_WIDTH,
  DefaultFormRowSx,
  DefaultFormRowSpacing,
} from '../common';
import { useEncounter } from '../../api';
import { extractProperty } from '@common/utils';

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
        sx: { ...inputProps.sx, ...DefaultFormRowSpacing },
      }}
      labelWidthPercentage={FORM_LABEL_WIDTH}
      inputAlignment={'start'}
    />
  ) : (
    <Box sx={DefaultFormRowSx}>
      <Box style={{ textAlign: 'end' }} flexBasis={FORM_LABEL_COLUMN_WIDTH}>
        <FormLabel sx={{ fontWeight: 'bold' }}>
          {labelWithPunctuation(label)}
        </FormLabel>
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
