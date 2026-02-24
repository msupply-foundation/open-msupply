import React, { useState } from 'react';
import { rankWith, ControlProps, uiTypeIs } from '@jsonforms/core';
import { useJsonForms, withJsonFormsControlProps } from '@jsonforms/react';
import {
  Autocomplete,
  Box,
  DetailInputWithLabelRow,
  PeriodNode,
  PeriodScheduleNode,
  DateTimePickerInput,
} from '@openmsupply-client/common';
import { DefaultFormRowSx, FORM_LABEL_WIDTH } from '../../common';
import { ProgramFragment, useProgramList } from '../../../api';
import { useSchedulesAndPeriods } from 'packages/requisitions/src';

export const scheduleFormTester = rankWith(10, uiTypeIs('ScheduleForm'));

interface FormState {
  program: ProgramFragment | null;
  schedule: PeriodScheduleNode | null;
  period: PeriodNode | null;
  after: Date | null;
  before: Date | null;
}

const UIComponent = (props: ControlProps) => {
  const { handleChange } = props;
  const [form, setForm] = useState<FormState>({
    program: null,
    schedule: null,
    period: null,
    after: null,
    before: null,
  });

  const { core } = useJsonForms();
  const { programId, scheduleId, periodId, after, before } = core?.data ?? {};

  const { data: programData, isLoading: programsLoading } = useProgramList();
  const { data: scheduleData, isLoading: schedulesLoading } =
    useSchedulesAndPeriods(programId ?? '');

  const programs = programData?.nodes ?? [];
  const schedules = scheduleData?.nodes ?? [];
  const periods = form.schedule?.periods.map(s => s.period) ?? [];

  // resaturate state
  if (programId && !form.program) {
    const program = programs.find(p => p.id === programId);
    if (program) setForm(prev => ({ ...prev, program }));
  }

  if (scheduleId && !form.schedule) {
    const schedule = schedules.find(s => s.id === scheduleId);
    if (schedule) {
      const period = schedule.periods
        .map(s => s.period)
        .find(p => p.id === periodId);
      setForm(prev => ({
        ...prev,
        schedule,
        period: period ?? null,
        after: after ? new Date(after) : null,
        before: before ? new Date(before) : null,
      }));
    }
  }

  const onProgramChange = (program: ProgramFragment | null) => {
    setForm({
      program,
      schedule: null,
      period: null,
      after: null,
      before: null,
    });
    handleChange('programId', program?.id);
    handleChange('scheduleId', undefined);
    handleChange('periodId', undefined);
    handleChange('after', undefined);
    handleChange('before', undefined);
  };

  const onScheduleChange = (schedule: PeriodScheduleNode | null) => {
    setForm(prev => ({
      ...prev,
      schedule,
      period: null,
      after: null,
      before: null,
    }));
    handleChange('scheduleId', schedule?.id);
    handleChange('periodId', undefined);
    handleChange('after', undefined);
    handleChange('before', undefined);
  };

  const onPeriodChange = (period: PeriodNode | null) => {
    const after = period ? new Date(period.startDate) : null;
    const before = period ? new Date(period.endDate) : null;

    setForm(prev => ({ ...prev, period, after, before }));
    handleChange('periodId', period?.id);
    handleChange('after', after?.toISOString());
    handleChange('before', before?.toISOString());
  };

  const onAfterChange = (date: Date | null) => {
    setForm(prev => ({ ...prev, after: date }));
    handleChange('after', date?.toISOString());
  };

  const onBeforeChange = (date: Date | null) => {
    setForm(prev => ({ ...prev, before: date }));
    handleChange('before', date?.toISOString());
  };

  return (
    <Box>
      <ProgramFilter
        form={form}
        options={programs}
        loading={programsLoading}
        handleChange={onProgramChange}
      />
      <ScheduleFilter
        form={form}
        options={schedules}
        loading={schedulesLoading}
        handleChange={onScheduleChange}
      />
      <PeriodFilter
        form={form}
        options={periods}
        handleChange={onPeriodChange}
      />
      <DateFilter
        label={'After'}
        value={form.after}
        onChange={onAfterChange}
        maxDate={form.before ?? undefined}
      />
      <DateFilter
        label={'Before'}
        value={form.before}
        onChange={onBeforeChange}
        minDate={form.after ?? undefined}
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

interface FilterProps<T> {
  form: FormState;
  options: T[];
  loading?: boolean;
  handleChange: (value: T | null) => void;
}

const ProgramFilter = ({
  form,
  options,
  loading,
  handleChange,
}: FilterProps<ProgramFragment>) => (
  <DetailInputWithLabelRow
    sx={DefaultFormRowSx}
    label={'Program'}
    labelWidthPercentage={FORM_LABEL_WIDTH}
    inputAlignment={'start'}
    Input={
      <Autocomplete
        fullWidth
        loading={loading}
        options={options}
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

const ScheduleFilter = ({
  form,
  options,
  loading,
  handleChange,
}: FilterProps<PeriodScheduleNode>) => (
  <DetailInputWithLabelRow
    sx={DefaultFormRowSx}
    label={'Schedule'}
    labelWidthPercentage={FORM_LABEL_WIDTH}
    inputAlignment={'start'}
    Input={
      <Autocomplete
        fullWidth
        loading={loading}
        options={options}
        optionKey="name"
        onChange={(_, option) => handleChange(option)}
        value={
          form.schedule
            ? { label: form.schedule.name ?? '', ...form.schedule }
            : null
        }
        isOptionEqualToValue={(option, value) => option.id === value.id}
        disabled={!form.program}
        // clearable={props.uischema.options?.['clearable'] ?? false}
      />
    }
  />
);

const PeriodFilter = ({
  form,
  options,
  handleChange,
}: FilterProps<PeriodNode>) => (
  <DetailInputWithLabelRow
    sx={DefaultFormRowSx}
    label={'Period'}
    labelWidthPercentage={FORM_LABEL_WIDTH}
    inputAlignment={'start'}
    Input={
      <Autocomplete
        fullWidth
        options={options}
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
        value={
          form.period ? { label: form.period.name ?? '', ...form.period } : null
        }
        isOptionEqualToValue={(option, value) => option.id === value.id}
        disabled={!form.schedule}
      />
    }
  />
);

interface DateFilterProps {
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  minDate?: Date;
  maxDate?: Date;
}

const DateFilter = ({
  label,
  value,
  onChange,
  minDate,
  maxDate,
}: DateFilterProps) => (
  <DetailInputWithLabelRow
    sx={DefaultFormRowSx}
    label={label}
    labelWidthPercentage={FORM_LABEL_WIDTH}
    inputAlignment={'start'}
    Input={
      <DateTimePickerInput
        value={value}
        onChange={onChange}
        minDate={minDate}
        maxDate={maxDate}
      />
    }
  />
);
