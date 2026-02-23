import React from 'react';
import { ControlProps, rankWith, uiTypeIs } from '@jsonforms/core';
import {
  Autocomplete,
  CLEAR,
  DetailInputWithLabelRow,
  extractProperty,
  PeriodScheduleNode,
} from '@openmsupply-client/common';
import { DefaultFormRowSx, FORM_LABEL_WIDTH } from '../../common';
import { useJsonForms, withJsonFormsControlProps } from '@jsonforms/react';
import { useSchedulesAndPeriods } from 'packages/requisitions/src';

export const scheduleSelectorTester = rankWith(
  10,
  uiTypeIs('ScheduleSelector')
);

const UIComponent = (props: ControlProps) => {
  const { handleChange, label, path } = props;
  const { core } = useJsonForms();

  const programId = extractProperty(core?.data, 'programId');

  const { data, isLoading } = useSchedulesAndPeriods(programId);

  const [schedule, setSchedule] = React.useState<PeriodScheduleNode | null>(
    null
  );
  const scheduleId = extractProperty(core?.data, 'scheduleId');

  const onChange = async (schedule: PeriodScheduleNode | null) => {
    setSchedule(schedule);
    if (schedule === null) {
      handleChange(path, undefined);
    } else {
      if (path === 'scheduleId') {
        handleChange(path, schedule.id);
      }
    }
  };

  if (scheduleId && !schedule) {
    const schedule = data?.nodes.find(schedule => schedule.id === scheduleId);
    if (schedule) {
      setSchedule(schedule);
    }
  }

  const schedules = data?.nodes ?? [];

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
          options={schedules}
          optionKey="name"
          onChange={(_, value) => value && onChange(value)}
          onInputChange={(
            _event: React.SyntheticEvent<Element, Event>,
            _value: string,
            reason: string
          ) => {
            if (reason === CLEAR) {
              onChange(null);
            }
          }}
          value={schedule ? { label: schedule.name ?? '', ...schedule } : null}
          isOptionEqualToValue={(option, value) => option.id === value.id}
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

export const ScheduleSelector = withJsonFormsControlProps(UIComponentWrapper);
