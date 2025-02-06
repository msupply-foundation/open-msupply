import React, { useState } from 'react';
import { rankWith, ControlProps, uiTypeIs } from '@jsonforms/core';
import { z } from 'zod';
import {
  Autocomplete,
  DetailInputWithLabelRow,
  extractProperty,
} from '@openmsupply-client/common';
import {
  DefaultFormRowSx,
  FORM_LABEL_WIDTH,
  useZodOptionsValidation,
} from '../common';
import { useJsonForms, withJsonFormsControlProps } from '@jsonforms/react';
import { usePeriodList } from '../../api/hooks/usePeriodList';
import { PeriodFragment } from '@openmsupply-client/requisitions';

export const periodSearchTester = rankWith(10, uiTypeIs('PeriodSearch'));

const Options = z.object({
  findByProgram: z.boolean().optional(),
});

const UIComponent = (props: ControlProps) => {
  const { handleChange, label, path, uischema } = props;
  const [period, setPeriod] = useState<PeriodFragment | null>(null);
  const { options } = useZodOptionsValidation(Options, uischema.options);
  const { core } = useJsonForms();
  const programId = options?.findByProgram
    ? extractProperty(core?.data, 'programId')
    : null;
  const { data, isLoading } = usePeriodList(
    programId,
    options?.findByProgram ? !!programId : false
  );

  const onChange = async (period: PeriodFragment) => {
    setPeriod(period);
    handleChange(path, period.id);
  };

  return (
    <DetailInputWithLabelRow
      sx={DefaultFormRowSx}
      label={label}
      labelWidthPercentage={FORM_LABEL_WIDTH}
      inputAlignment={'start'}
      Input={
        <Autocomplete
          fullWidth
          loading={isLoading}
          options={data?.nodes ?? []}
          optionKey="name"
          onChange={(_, newVal) =>
            newVal && newVal.id !== period?.id && onChange(newVal)
          }
          value={period ? { label: period.name ?? '', ...period } : null}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          clearable={false}
          disabled={options?.findByProgram ? !programId : false}
        />
      }
    />
  );
};

const UIComponentWrapper = (props: ControlProps) => {
  if (!props.visible) {
    return null;
  }
  return <UIComponent {...props} />;
};

export const PeriodSearch = withJsonFormsControlProps(UIComponentWrapper);
