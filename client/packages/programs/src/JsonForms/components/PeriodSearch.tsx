import React, { useState } from 'react';
import { rankWith, ControlProps, uiTypeIs } from '@jsonforms/core';
import { z } from 'zod';
import {
  AutocompleteWithPagination,
  DateUtils,
  DetailInputWithLabelRow,
  extractProperty,
  Formatter,
} from '@openmsupply-client/common';
import {
  DefaultFormRowSx,
  FORM_LABEL_WIDTH,
  useZodOptionsValidation,
} from '../common';
import { useJsonForms, withJsonFormsControlProps } from '@jsonforms/react';
import { usePeriodList } from '../../api/hooks/usePeriodList';
import { PeriodFragment } from '@openmsupply-client/requisitions';

const RECORDS_PER_PAGE = 15;
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
  const today = new Date();
  const lastDayOfMonth = DateUtils.lastDayOfMonth(today);
  const { data, isFetching, fetchNextPage } = usePeriodList(
    RECORDS_PER_PAGE,
    programId,
    options?.findByProgram ? !!programId : true,
    {
      endDate: {
        beforeOrEqualTo: Formatter.naiveDate(lastDayOfMonth),
      },
    }
  );

  const pageNumber = data?.pages?.length
    ? (data.pages[data.pages.length - 1]?.pageNumber ?? 0)
    : 0;

  const onChange = async (period: PeriodFragment) => {
    setPeriod(period);

    if (path === 'periodId') {
      handleChange(path, period.id);
    } else {
      // date range so we can use it if no period id is saved
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
        <AutocompleteWithPagination
          width={'100%'}
          pages={data?.pages ?? []}
          pageNumber={pageNumber}
          rowsPerPage={RECORDS_PER_PAGE}
          totalRows={data?.pages?.[0]?.data.totalCount ?? 0}
          loading={isFetching}
          optionKey="name"
          onChange={(_, value) => value && onChange(value)}
          getOptionLabel={option => option.name}
          value={period ? { label: period.name ?? '', ...period } : null}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          clearable={false}
          disabled={options?.findByProgram ? !programId : false}
          onPageChange={pageNumber => fetchNextPage({ pageParam: pageNumber })}
          paginationDebounce={300}
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
