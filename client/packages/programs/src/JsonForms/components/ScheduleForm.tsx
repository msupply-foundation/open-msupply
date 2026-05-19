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
  DateUtils,
} from '@openmsupply-client/common';
import { DefaultFormRowSx, FORM_LABEL_WIDTH } from '../common';
import { ProgramFragment, useProgramList } from '../../api';
import { useSchedulesAndPeriods } from '@openmsupply-client/requisitions/src';

export const scheduleFormTester = rankWith(10, uiTypeIs('ScheduleForm'));

interface FormState {
  programId: string | null;
  scheduleId: string | null;
  periodId: string | null;
  after: Date | null;
  before: Date | null;
}

const UIComponent = (props: ControlProps) => {
  const t = useTranslation();
  const { handleChange } = props;

  const { core } = useJsonForms();
  const { programId, scheduleId, periodId, after, before } = core?.data ?? {};

  const [form, setForm] = useState<FormState>({
    programId: programId ?? null,
    scheduleId: scheduleId ?? null,
    periodId: periodId ?? null,
    after: after ? new Date(after) : null,
    before: before ? new Date(before) : null,
  });

  const { data: programData, isLoading: programsLoading } = useProgramList();
  const { data: scheduleData, isLoading: schedulesLoading } =
    useSchedulesAndPeriods(form.programId ?? '');

  const programs = programData?.nodes ?? [];
  const schedules = scheduleData?.nodes ?? [];

  const program = programs.find(p => p.id === form.programId) ?? null;
  const schedule = schedules.find(s => s.id === form.scheduleId) ?? null;
  const periods = schedule?.periods.map(s => s.period) ?? [];
  const period = periods.find(p => p.id === form.periodId) ?? null;

  const onProgramChange = (program: ProgramFragment | null) => {
    setForm({
      programId: program?.id ?? null,
      scheduleId: null,
      periodId: null,
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
      scheduleId: schedule?.id ?? null,
      periodId: null,
      after: null,
      before: null,
    }));
    handleChange('scheduleId', schedule?.id);
    handleChange('periodId', undefined);
    handleChange('after', undefined);
    handleChange('before', undefined);
  };

  const onDateChange = (path: 'after' | 'before', date: Date | null) => {
    const value = path === 'before' && date ? DateUtils.endOfDay(date) : date;
    setForm(prev => ({ ...prev, [path]: value }));
    handleChange(path, value?.toISOString());
  };

  const onPeriodChange = (period: PeriodNode | null) => {
    setForm(prev => ({ ...prev, periodId: period?.id ?? null }));
    handleChange('periodId', period?.id);
    onDateChange('after', period ? new Date(period.startDate) : null);
    onDateChange('before', period ? new Date(period.endDate) : null);
  };

  return (
    <Box>
      <AutocompleteFilter
        label={t('label.program')}
        value={program}
        options={programs}
        loading={programsLoading}
        clearable={false}
        handleChange={onProgramChange}
      />
      <AutocompleteFilter
        label={t('label.schedule')}
        value={schedule}
        options={schedules}
        loading={schedulesLoading}
        disabled={!form.programId}
        handleChange={onScheduleChange}
      />
      <AutocompleteFilter
        label={t('label.period')}
        value={period}
        options={periods}
        disabled={!form.scheduleId}
        handleChange={onPeriodChange}
      />
      <DateFilter
        label={t('label.from-date')}
        value={form.after}
        handleChange={date => onDateChange('after', date)}
        maxDate={form.before ?? undefined}
      />
      <DateFilter
        label={t('label.to-date')}
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
