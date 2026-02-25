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
  useTranslation,
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
  const t = useTranslation();
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

  const onDateChange = (path: 'after' | 'before', date: Date | null) => {
    setForm(prev => ({ ...prev, [path]: date }));
    handleChange(path, date?.toISOString());
  };

  return (
    <Box>
      <AutocompleteFilter
        label={t('label.program')}
        value={form.program}
        options={programs}
        loading={programsLoading}
        clearable={false}
        handleChange={onProgramChange}
      />
      <AutocompleteFilter
        label={t('label.schedule')}
        value={form.schedule}
        options={schedules}
        loading={schedulesLoading}
        disabled={!form.program}
        handleChange={onScheduleChange}
      />
      <AutocompleteFilter
        label={t('label.period')}
        value={form.period}
        options={periods}
        disabled={!form.schedule}
        handleChange={onPeriodChange}
      />
      <DateFilter
        label={t('label.start-date')}
        value={form.after}
        handleChange={date => onDateChange('after', date)}
        maxDate={form.before ?? undefined}
      />
      <DateFilter
        label={t('label.end-date')}
        value={form.before}
        handleChange={date => onDateChange('before', date)}
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

interface AutocompleteFilterProps<T> {
  label: string;
  value: T | null;
  options: T[];
  loading?: boolean;
  disabled?: boolean;
  clearable?: boolean;
  handleChange: (value: T | null) => void;
}

const AutocompleteFilter = <T extends { id: string; name: string }>({
  label,
  value,
  options,
  loading,
  disabled,
  clearable,
  handleChange,
}: AutocompleteFilterProps<T>) => (
  <DetailInputWithLabelRow
    sx={DefaultFormRowSx}
    label={label}
    labelWidthPercentage={FORM_LABEL_WIDTH}
    inputAlignment={'start'}
    Input={
      <Autocomplete
        fullWidth
        loading={loading}
        options={options}
        optionKey="name"
        onChange={(_, option) => handleChange(option)}
        value={value ? { label: value.name ?? '', ...value } : null}
        isOptionEqualToValue={(option, v) => option.id === v.id}
        disabled={disabled}
        clearable={clearable}
      />
    }
  />
);

interface DateFilterProps {
  label: string;
  value: Date | null;
  handleChange: (date: Date | null) => void;
  minDate?: Date;
  maxDate?: Date;
}

const DateFilter = ({
  label,
  value,
  handleChange,
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
        onChange={handleChange}
        minDate={minDate}
        maxDate={maxDate}
        actions={['accept']}
      />
    }
  />
);
