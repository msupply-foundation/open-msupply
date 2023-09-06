import { ControlProps, rankWith, uiTypeIs } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { DetailInputWithLabelRow } from '@openmsupply-client/common';
import React from 'react';
import { z } from 'zod';
import { useProgramEnrolments } from '../../api';
import {
  DefaultFormRowSpacing,
  FORM_LABEL_WIDTH,
  useZodOptionsValidation,
} from '../common';

const Options = z
  .object({
    programEnrolmentType: z.string(),
  })
  .strict();
type Options = z.infer<typeof Options>;

const UIComponent = (props: ControlProps) => {
  const { label, uischema, config } = props;

  const { errors, options } = useZodOptionsValidation(
    Options,
    uischema.options
  );

  // fetch matching program enrolment
  const { data } = useProgramEnrolments.document.list({
    filterBy: {
      type: { equalTo: options?.programEnrolmentType },
      patientId: { equalTo: config?.patientId },
    },
  });
  const enrolment = data?.nodes[0];

  if (!props.visible) {
    return null;
  }

  const inputProps = {
    value: enrolment?.programEnrolmentId ? enrolment.programEnrolmentId : '',
    disabled: true,
    sx: {},
    required: props.required,
    errors,
  };

  return (
    <DetailInputWithLabelRow
      label={label}
      inputProps={{
        value: enrolment?.programEnrolmentId
          ? enrolment.programEnrolmentId
          : '',
        disabled: true,
        required: props.required,
        error: !!errors,
        helperText: errors,
        sx: { ...inputProps.sx, ...DefaultFormRowSpacing },
      }}
      labelWidthPercentage={FORM_LABEL_WIDTH}
      inputAlignment="start"
    />
  );
};

/**
 * Shows a the enrolment id for a given enrolment type
 */
export const EnrolmentId = withJsonFormsControlProps(UIComponent);

export const enrolmentIdTester = rankWith(10, uiTypeIs('EnrolmentId'));
