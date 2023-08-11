import React from 'react';
import { rankWith, ControlProps, isDateControl } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import {
  DetailInputWithLabelRow,
  useFormatDateTime,
  BaseDatePickerInput,
  DateUtils,
  LocaleKey,
  useTranslation,
} from '@openmsupply-client/common';
import { FORM_LABEL_WIDTH } from '../styleConstants';
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
  const [hasData, setHasData] = React.useState(!!data);
  const dateFormatter = useFormatDateTime().customDate;
  const { errors: zErrors, options } = useZodOptionsValidation(
    Options,
    uischema.options
  );
  const t = useTranslation('common');
  const { customError, setCustomError } = useJSONFormsCustomError(path, 'Date');
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
          value={DateUtils.getDateOrNull(data)}
          onChange={e => {
            setHasData(e !== null);
            if (e) handleChange(path, dateFormatter(e, 'yyyy-MM-dd'));
            if (customError) setCustomError(undefined);
          }}
          format="dd/MM/yyyy"
          disabled={!props.enabled}
          error={hasData ? customError ?? props.errors ?? zErrors : ''}
          disableFuture={disableFuture}
          onBlur={() => setHasData(true)}
          onError={validationError =>
            setCustomError(
              t(`error.date_${validationError}` as LocaleKey, {
                defaultValue: validationError,
              })
            )
          }
        />
      }
    />
  );
};

export const Date = withJsonFormsControlProps(UIComponent);
