import React from 'react';
import { ControlProps, rankWith, uiTypeIs } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { DetailInputWithLabelRow } from '@openmsupply-client/common';
import { FORM_LABEL_WIDTH } from '../common';
import { useEncounter } from '../../api';
import { get as extractProperty } from 'lodash';

export const previousEncounterTextTester = rankWith(
  10,
  uiTypeIs('PreviousEncounterText')
);

const UIComponent = (props: ControlProps) => {
  const { label, path } = props;

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

  return (
    <DetailInputWithLabelRow
      label={label}
      inputProps={{
        value: previousEncounter
          ? extractProperty(previousEncounter.document.data, path)
          : '',
        sx: { margin: 0.5, width: '100%' },
        disabled: true,
        required: props.required,
      }}
      labelWidthPercentage={FORM_LABEL_WIDTH}
      inputAlignment={'start'}
    />
  );
};

/**
 * Shows a field from the previous encounter
 */
export const PreviousEncounterTextField =
  withJsonFormsControlProps(UIComponent);
