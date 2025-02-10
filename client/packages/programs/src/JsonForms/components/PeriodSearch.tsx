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
    options?.findByProgram ? !!programId : true
  );

  const onChange = async (period: PeriodFragment) => {
    setPeriod(period);

    if (path === 'periodId') {
      handleChange(path, period.id);
    } else {
      // date range so we can use it in if no period id is saved
      handleChange(path, new Date(period.startDate).toISOString());
      const endOfDay = new Date(period.endDate);
      endOfDay.setHours(24, 59, 59, 999);
      handleChange('before', endOfDay.toISOString());
    }
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
