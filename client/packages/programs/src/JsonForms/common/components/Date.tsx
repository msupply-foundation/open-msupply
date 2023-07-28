import React from 'react';
import { rankWith, ControlProps, isDateControl } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import {
  DetailInputWithLabelRow,
  useFormatDateTime,
  BaseDatePickerInput,
} from '@openmsupply-client/common';
import { FORM_LABEL_WIDTH } from '../styleConstants';
import { z } from 'zod';
import { useZodOptionsValidation } from '../hooks/useZodOptionsValidation';

const Options = z
  .object({
    disableFuture: z.boolean().optional(),
  })
  .strict()
  .optional();

type Options = z.infer<typeof Options>;

export const dateTester = rankWith(5, isDateControl);

const UIComponent = (props: ControlProps) => {
  const { data, handleChange, label, path, uischema } = props;
  const dateFormatter = useFormatDateTime().customDate;
  const { errors: zErrors, options } = useZodOptionsValidation(
    Options,
    uischema.options
  );

  const disableFuture = options?.disableFuture ?? false;

  if (!props.visible) {
    return null;
  }
  return (
    <DetailInputWithLabelRow
      sx={{
        marginTop: 0.5,
        gap: 2,
        minWidth: '300px',
        justifyContent: 'space-around',
      }}
      label={label}
      labelWidthPercentage={FORM_LABEL_WIDTH}
      inputAlignment="start"
      Input={
        <BaseDatePickerInput
          // undefined is displayed as "now" and null as unset
          value={data ?? null}
          onChange={e => {
            if (e) handleChange(path, dateFormatter(e, 'yyyy-MM-dd'));
          }}
          inputFormat="dd/MM/yyyy"
          disabled={!props.enabled}
          error={props.errors ?? zErrors}
          disableFuture={disableFuture}
        />
      }
    />
  );
};

export const Date = withJsonFormsControlProps(UIComponent);
