import React, { useState, useMemo } from 'react';
import { rankWith, ControlProps, uiTypeIs } from '@jsonforms/core';
import { useJsonForms, withJsonFormsControlProps } from '@jsonforms/react';
import {
  Autocomplete,
  Box,
  DetailInputWithLabelRow,
  extractProperty,
  AutocompleteWithPagination,
  Formatter,
} from '@openmsupply-client/common';
import { DefaultFormRowSx, FORM_LABEL_WIDTH } from '../../common';
import { ProgramFragment, useProgramList } from '../../../api';
import { usePeriodList } from '../../../api/hooks/usePeriodList';
import { PeriodFragment } from '@openmsupply-client/requisitions';

export const scheduleFormTester = rankWith(10, uiTypeIs('ScheduleForm'));

const UIComponent = (props: ControlProps) => {
  const { path, handleChange } = props;
  const [form, setForm] = useState({
    program: null as ProgramFragment | null,
    period: null as PeriodFragment | null,
  });

  const { core } = useJsonForms();

  const onProgramChange = async (program: ProgramFragment | null) => {
    setForm(prevForm => ({ ...prevForm, program, period: null }));

    // const elmisCode = program?.elmisCode ?? undefined;

    handleChange(`${path}.programId`, program?.id);
  };

  const onPeriodChange = async (period: PeriodFragment | null) => {
    setForm(prevForm => ({ ...prevForm, period }));
    if (period === null) {
      handleChange(path, undefined);
      handleChange('before', undefined);
    } else {
      handleChange(`${path}.periodId`, period.id);
      // } else {
      //   // date range so we can use it if no period id is saved
      //   // use PeriodSearch in arguments_ui with scope as "#/properties/after" to autofill the date range if period is selected
      //   handleChange(path, new Date(period.startDate).toISOString());
      //   const endOfDay = new Date(period.endDate);
      //   endOfDay.setHours(24, 59, 59, 999);
      //   handleChange('before', endOfDay.toISOString());
      //   handleChange('periodId', period.id);
      // }
    }
  };

  return (
    <Box>
      <ProgramFilter
        data={core?.data}
        form={form}
        handleChange={onProgramChange}
      />
      <PeriodFilter
        data={core?.data}
        form={form}
        handleChange={onPeriodChange}
      />
    </Box>
  );
};

const UIComponentWrapper = (props: ControlProps) => {
  if (!props.visible) {
    return null;
  }
  return <UIComponent {...props} />;
};

export const ScheduleForm = withJsonFormsControlProps(UIComponentWrapper);

interface FilterProps {
  data: any;
  form: {
    program: ProgramFragment | null;
    period: PeriodFragment | null;
  };
  handleChange: (value: any) => void;
}

const ProgramFilter = ({ data, form, handleChange }: FilterProps) => {
  const { data: programData, isLoading } = useProgramList();

  const programId = extractProperty(data, 'programId');
  const program = data?.program;

  if (programId && !program) {
    const program = programData?.nodes.find(
      program => program.id === data.program.id
    );
    if (program) {
      handleChange(program);
    }
  }

  const programs = programData?.nodes ?? [];

  return (
    <DetailInputWithLabelRow
      sx={DefaultFormRowSx}
      label={'Program'}
      labelWidthPercentage={FORM_LABEL_WIDTH}
      inputAlignment={'start'}
      Input={
        <Autocomplete
          fullWidth
          loading={isLoading}
          options={programs}
          optionKey="name"
          // onChange={(_, option) => {
          //   handleChange(programs.find(p => p.id === option?.id) || null);
          // }}
          onChange={(_, option) => handleChange(option)}
          // onInputChange={(
          //   _event: React.SyntheticEvent<Element, Event>,
          //   _value: string,
          //   reason: string
          // ) => {
          //   if (reason === CLEAR) {
          //     onChange(null);
          //   }
          // }}
          value={
            form.program
              ? { label: form.program.name ?? '', ...form.program }
              : null
          }
          isOptionEqualToValue={(option, value) => option.id === value.id}
          // clearable={props.uischema.options?.['clearable'] ?? false}
        />
      }
    />
  );
};

const PeriodFilter = ({ data, form, handleChange }: FilterProps) => {
  const period = data.period;

  const RECORDS_PER_PAGE = 15;
  const today = new Date();

  const {
    data: periodData,
    isFetching,
    fetchNextPage,
    isRefetching,
  } = usePeriodList(
    RECORDS_PER_PAGE,
    data?.program?.id,
    data?.program?.id ?? true,
    {
      startDate: {
        beforeOrEqualTo: Formatter.naiveDate(today),
      },
    }
  );
  const periodId = extractProperty(data, 'periodId');

  useMemo(() => {
    if (periodId && !period) {
      const period = periodData?.pages
        ?.find(page => page.data.nodes.some(period => period.id === periodId))
        ?.data.nodes.find(period => period.id === periodId);
      if (period) {
        handleChange(period.id);
      }
    }
    if (isRefetching) {
      handleChange(null);
    }
  }, [periodId, period, data, isRefetching]);

  const pageNumber = data?.pages?.length
    ? (data.pages[data.pages.length - 1]?.pageNumber ?? 0)
    : 0;

  return (
    <DetailInputWithLabelRow
      sx={DefaultFormRowSx}
      label={'Period'}
      labelWidthPercentage={FORM_LABEL_WIDTH}
      inputAlignment={'start'}
      Input={
        <AutocompleteWithPagination
          width={'100%'}
          pages={periodData?.pages ?? []}
          pageNumber={pageNumber}
          rowsPerPage={RECORDS_PER_PAGE}
          totalRows={periodData?.pages?.[0]?.data.totalCount ?? 0}
          loading={isFetching}
          optionKey="name"
          onChange={(_, option) => handleChange(option)}
          // onInputChange={(
          //   _event: React.SyntheticEvent<Element, Event>,
          //   _value: string,
          //   reason: string
          // ) => {
          //   if (reason === CLEAR) {
          //     onChange(null);
          //   }
          // }}
          getOptionLabel={option => option.name}
          value={
            form.period
              ? { label: form.period.name ?? '', ...form.period }
              : null
          }
          isOptionEqualToValue={(option, value) => option.id === value.id}
          // clearable={props.uischema.options?.['clearable'] ?? false}
          disabled={!form.program} // is this duplicated?
          onPageChange={pageNumber => fetchNextPage({ pageParam: pageNumber })}
          paginationDebounce={300}
        />
      }
    />
  );
};
