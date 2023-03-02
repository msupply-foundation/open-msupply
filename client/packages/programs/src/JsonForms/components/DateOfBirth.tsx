import React, { useEffect } from 'react';
import {
  rankWith,
  ControlProps,
  uiTypeIs,
  composePaths,
} from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { FormLabel, Box } from '@mui/material';
import {
  BaseDatePickerInput,
  DateUtils,
  NonNegativeIntegerInput,
  useFormatDateTime,
  useTranslation,
} from '@openmsupply-client/common';
import {
  FORM_INPUT_COLUMN_WIDTH,
  FORM_LABEL_COLUMN_WIDTH,
  DefaultFormRowSx,
} from '../common';

export const dateOfBirthTester = rankWith(10, uiTypeIs('DateOfBirth'));

const UIComponent = (props: ControlProps) => {
  const { data, handleChange, label, path } = props;
  const [age, setAge] = React.useState<number | string>('');
  const [dob, setDoB] = React.useState<Date | null>(null);
  const t = useTranslation('common');
  const dateFormatter = useFormatDateTime().customDate;

  const dobPath = composePaths(path, 'dateOfBirth');
  const estimatedPath = composePaths(path, 'dateOfBirthIsEstimated');
  const onChangeDoB = (dob: Date | null, keyBoardInputValue?: string) => {
    // dob is returned from the date picker, the keyBoardInputValue is the TextInput value
    // and will be populated if the user types in a date
    const dateOfBirth =
      dob !== null && DateUtils.isValid(dob)
        ? dob
        : DateUtils.getDateOrNull(keyBoardInputValue ?? null);
    // if dob is invalid, clear age and don't update the form data
    if (dateOfBirth === null) {
      setAge('');
      return;
    }
    setAge(DateUtils.age(dateOfBirth));
    setDoB(dateOfBirth);
    handleChange(dobPath, dateFormatter(dateOfBirth, 'yyyy-MM-dd'));
    handleChange(estimatedPath, false);
  };

  const onChangeAge = (newAge: number) => {
    const dob = DateUtils.startOfYear(DateUtils.addYears(new Date(), -newAge));
    setDoB(dob);
    handleChange(dobPath, dateFormatter(dob, 'yyyy-MM-dd'));
    handleChange(estimatedPath, true);
    setAge(newAge);
  };

  useEffect(() => {
    if (!data) return;
    const dob = DateUtils.getDateOrNull(data.dateOfBirth);
    setDoB(dob);
    if (dob === null) return;
    setAge(DateUtils.age(dob));
  }, [data]);

  if (!props.visible) {
    return null;
  }
  return (
    <Box sx={DefaultFormRowSx}>
      <Box style={{ textAlign: 'end' }} flexBasis={FORM_LABEL_COLUMN_WIDTH}>
        <FormLabel sx={{ fontWeight: 'bold' }}>{label}:</FormLabel>
      </Box>
      <Box
        flexBasis={FORM_INPUT_COLUMN_WIDTH}
        display="flex"
        alignItems="center"
      >
        <BaseDatePickerInput
          // undefined is displayed as "now" and null as unset
          value={dob ?? null}
          onChange={onChangeDoB}
          inputFormat="dd/MM/yyyy"
          InputProps={{ style: { width: 135 } }}
          disableFuture
        />
        <Box
          flex={0}
          style={{ textAlign: 'end' }}
          flexBasis={FORM_LABEL_COLUMN_WIDTH}
        >
          <FormLabel sx={{ fontWeight: 'bold' }}>{t('label.age')}:</FormLabel>
        </Box>
        <Box flex={0}>
          <NonNegativeIntegerInput
            value={age}
            style={{ width: 50 }}
            onChange={onChangeAge}
          />
        </Box>
      </Box>
    </Box>
  );
};

export const DateOfBirth = withJsonFormsControlProps(UIComponent);
