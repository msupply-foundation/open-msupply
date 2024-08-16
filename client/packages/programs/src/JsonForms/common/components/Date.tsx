import React from 'react';
import { rankWith, ControlProps, isDateControl } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import {
  DetailInputWithLabelRow,
  useFormatDateTime,
  BaseDatePickerInput,
} from '@openmsupply-client/common';
import { DefaultFormRowSx, FORM_LABEL_WIDTH } from '../styleConstants';
import { z } from 'zod';
import { useZodOptionsValidation } from '../hooks/useZodOptionsValidation';
import { useJSONFormsCustomError } from '../hooks/useJSONFormsCustomError';

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
  const formatDateTime = useFormatDateTime();
  const { errors: zErrors, options } = useZodOptionsValidation(
    Options,
    uischema.options
  );
  const { customError, setCustomError } = useJSONFormsCustomError(path, 'Date');
  const disableFuture = options?.disableFuture ?? false;

  if (!props.visible) {
    return null;
  }

  return (
    <DetailInputWithLabelRow
      sx={DefaultFormRowSx}
      inputSx={{
        '& > .MuiBox-root': {
          flexBasis: '90%',
          width: '100%',
        },
      }}
      label={label}
      labelWidthPercentage={FORM_LABEL_WIDTH}
      inputAlignment="start"
      Input={
        <BaseDatePickerInput
          sx={{ width: '100%' }}
          // undefined is displayed as "now" and null as unset
          value={formatDateTime.getLocalDate(data)}
          onChange={e => {
            handleChange(
              path,
              !e ? undefined : formatDateTime.customDate(e, 'yyyy-MM-dd')
            );
            if (customError) setCustomError(undefined);
          }}
          format="P"
          disabled={!props.enabled}
          error={customError ?? props.errors ?? zErrors ?? ''}
          disableFuture={disableFuture}
          onError={validationError => setCustomError(validationError)}
          slotProps={{
            actionBar: {
              actions: ['clear'],
            },
          }}
        />
      }
    />
  );
};

export const Date = withJsonFormsControlProps(UIComponent);
