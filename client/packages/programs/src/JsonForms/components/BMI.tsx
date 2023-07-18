import React, { useEffect } from 'react';
import {
  composePaths,
  ControlProps,
  rankWith,
  uiTypeIs,
} from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { DetailInputWithLabelRow, NumUtils } from '@openmsupply-client/common';
import { FORM_LABEL_WIDTH } from '../common';
import { useEncounter, useProgramEvents } from '../../api';

export const bmiTester = rankWith(10, uiTypeIs('BMI'));

const round = (value: number) => Math.round(value * 100) / 100;

const usePreviousHeight = (
  formData: any | undefined,
  eventType: string | undefined
) => {
  // fetch current encounter
  const encounterId = useEncounter.utils.idFromUrl();
  const { data: currentEncounter } = useEncounter.document.byId(encounterId);
  const { data: events } = useProgramEvents.document.list(
    {
      // at: beforeDate,
      filter: {
        patientId: { equalTo: currentEncounter?.patient?.id ?? '' },
        type: {
          equalTo: 'physicalExaminationHeight',
        },
        documentType: {
          equalTo: currentEncounter?.type,
        },
      },
      page: {
        first: 1,
      },
    },
    !!currentEncounter && !!eventType
  );

  if (formData && formData.height) return formData.height;

  const event = events?.nodes[0];
  if (event?.data === undefined || event?.data === null) {
    return undefined;
  }
  return Number.parseFloat(event.data);
};

const UIComponent = (props: ControlProps) => {
  const { data, handleChange, label, path } = props;
  const { weight } = data ?? {};

  const height = usePreviousHeight(data, 'physicalExaminationHeight');

  useEffect(() => {
    if (!height || !weight) return;

    const h = height;
    const w = NumUtils.parseString(weight);

    if (!handleChange || !w) return;

    const bmi = w && h ? round(w / (h * h)) : undefined;
    handleChange(composePaths(path, 'bodyMassIndex'), bmi);
  }, [height, weight]);

  if (!props.visible) {
    return null;
  }

  return (
    <DetailInputWithLabelRow
      label={label}
      inputProps={{
        value: data?.bodyMassIndex ?? '',
        sx: { margin: 0.5, width: '100px' },
        disabled: true,
      }}
      labelWidthPercentage={FORM_LABEL_WIDTH}
      inputAlignment="start"
    />
  );
};

export const BMI = withJsonFormsControlProps(UIComponent);
