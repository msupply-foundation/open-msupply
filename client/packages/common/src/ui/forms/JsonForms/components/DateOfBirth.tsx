import React, { useEffect } from 'react';
import { rankWith, ControlProps, uiTypeIs } from '@jsonforms/core';
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
  FORM_LABEL_COLUMN_WIDTH,
  FORM_INPUT_COLUMN_WIDTH,
} from '../styleConstants';

export const dateOfBirthTester = rankWith(4, uiTypeIs('DateOfBirthControl'));

const UIComponent = (props: ControlProps) => {
  const { data, handleChange, label, path } = props;
  const [age, setAge] = React.useState<number | string>('');
  const [dob, setDoB] = React.useState<Date | null>(data);
  const t = useTranslation('common');
  const dateFormatter = useFormatDateTime().customDate;

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
    handleChange(path, dateFormatter(dateOfBirth, 'yyyy-MM-dd'));
  };

  const onChangeAge = (newAge: number) => {
    const dob = DateUtils.addYears(new Date(), -newAge);
    setDoB(dob);
    handleChange(path, dateFormatter(dob, 'yyyy-MM-dd'));
    setAge(newAge);
  };

  useEffect(() => {
    if (!data) return;
    const dob = DateUtils.getDateOrNull(data);
    if (dob === null) return;
    setAge(DateUtils.age(dob));
  }, [data]);

  if (!props.visible) {
    return null;
  }
  return (
    <Box
      display="flex"
      alignItems="center"
      gap={2}
      justifyContent="space-around"
      style={{ minWidth: 300 }}
      marginTop={1}
    >
      <Box style={{ textAlign: 'end' }} flexBasis={FORM_LABEL_COLUMN_WIDTH}>
        <FormLabel sx={{ fontWeight: 'bold' }}>{label}:</FormLabel>
      </Box>
      <Box
        flexBasis={FORM_INPUT_COLUMN_WIDTH}
        display="flex"
        alignItems="center"
        gap={2}
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
