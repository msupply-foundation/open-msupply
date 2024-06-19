import { ControlProps, rankWith, uiTypeIs } from '@jsonforms/core';
import { useJsonForms, withJsonFormsControlProps } from '@jsonforms/react';
import { DetailInputWithLabelRow } from '@openmsupply-client/common';
import React from 'react';
import { z } from 'zod';
import { extractProperty } from '@common/utils';
import { useProgramEnrolments } from '../../api';
import {
  DefaultFormRowSpacing,
  FORM_LABEL_WIDTH,
  useZodOptionsValidation,
} from '../common';

const Options = z
  .object({
    programEnrolmentType: z.string(),
    /**
     * Specifies a field pointing to a patientId.
     * This patient id is then used to query for the program enrolment.
     * If there is no data at patientIdField nothing is displayed.
     */
    patientIdField: z.string().optional(),
  })
  .strict();
type Options = z.infer<typeof Options>;

const UIComponent = (props: ControlProps) => {
  const { label, uischema, config } = props;

  const { errors, options } = useZodOptionsValidation(
    Options,
    uischema.options
  );

  const { core } = useJsonForms();
  const patientId = options?.patientIdField
    ? extractProperty(core?.data, options.patientIdField, '') // use empty/invalid id if field is not set
    : config?.patientId;

  // fetch matching program enrolment
  const { data } = useProgramEnrolments.document.list({
    filterBy: {
      type: { equalTo: options?.programEnrolmentType },
      patientId: { equalTo: patientId },
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
