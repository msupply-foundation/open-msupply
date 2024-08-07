import React, { useEffect } from 'react';
import {
  rankWith,
  ControlProps,
  uiTypeIs,
  composePaths,
} from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import {
  BaseDatePickerInput,
  DateUtils,
  useFormatDateTime,
  useTranslation,
  FormLabel,
  Box,
  DetailInputWithLabelRow,
  NumericTextInput,
  Typography,
} from '@openmsupply-client/common';
import { DefaultFormRowSx, FORM_GAP, FORM_LABEL_WIDTH } from '../common';
import { useJSONFormsCustomError } from '../common/hooks/useJSONFormsCustomError';

export const dateOfBirthTester = rankWith(10, uiTypeIs('DateOfBirth'));

const UIComponent = (props: ControlProps) => {
  const { data, handleChange, label, path } = props;
  const [age, setAge] = React.useState<number | undefined>();
  const [dob, setDoB] = React.useState<Date | null>(null);
  const t = useTranslation();
  const formatDateTime = useFormatDateTime();
  const { customError, setCustomError } = useJSONFormsCustomError(
    path,
    'Date of Birth'
  );

  const dobPath = composePaths(path, 'dateOfBirth');
  const estimatedPath = composePaths(path, 'dateOfBirthIsEstimated');
  const onChangeDoB = (dob: Date | null) => {
    const dateOfBirth = DateUtils.getDateOrNull(dob);
    // if dob is invalid, clear age and don't update all the form data
    if (dateOfBirth === null || !DateUtils.isValid(dateOfBirth)) {
      setAge(undefined);
      handleChange(dobPath, null); // required for validation to fire
      return;
    }
    setCustomError(undefined);
    setAge(DateUtils.age(dateOfBirth));
    setDoB(dateOfBirth);
    handleChange(dobPath, formatDateTime.customDate(dateOfBirth, 'yyyy-MM-dd'));
    handleChange(estimatedPath, false);
  };

  const onChangeAge = (newAge: number = 0) => {
    const dob = DateUtils.startOfYear(DateUtils.addYears(new Date(), -newAge));
    setDoB(dob);
    handleChange(dobPath, formatDateTime.customDate(dob, 'yyyy-MM-dd'));
    handleChange(estimatedPath, true);
    setCustomError(undefined);
    setAge(newAge);
  };

  useEffect(() => {
    if (!data) return;
    const dob = DateUtils.getDateOrNull(data.dateOfBirth);
    setDoB(dob);
    if (dob === null) {
      setAge(undefined);
      return;
    }
    setAge(DateUtils.age(dob));
  }, [data]);

  if (!props.visible) {
    return null;
  }

  const { months, days } = DateUtils.ageInMonthsAndDays(dob ?? '');

  return (
    <DetailInputWithLabelRow
      sx={DefaultFormRowSx}
      label={label}
      labelWidthPercentage={FORM_LABEL_WIDTH}
      inputAlignment={'start'}
      Input={
        <Box display="flex" alignItems="center" gap={FORM_GAP} width="100%">
          <BaseDatePickerInput
            // undefined is displayed as "now" and null as unset
            value={formatDateTime.getLocalDate(dob)}
            onChange={onChangeDoB}
            format="P"
            width={135}
            disableFuture
            disabled={!props.enabled}
            onError={validationError => setCustomError(validationError)}
            error={customError}
            slotProps={{
              actionBar: {
                actions: ['clear'],
              },
            }}
          />

          <Box flex={0} style={{ textAlign: 'end' }}>
            <FormLabel sx={{ fontWeight: 'bold' }}>{t('label.age')}:</FormLabel>
          </Box>
          {(age ?? 1 >= 1) ? (
            <Box flex={0}>
              <NumericTextInput
                value={age}
                sx={{ width: 65 }}
                onChange={onChangeAge}
                disabled={!props.enabled}
              />
            </Box>
          ) : (
            <Typography fontSize="85%" whiteSpace="nowrap">
              {months > 0 && t('label.age-months-and', { count: months })}
              {t('label.age-days', { count: days })}
            </Typography>
          )}
        </Box>
      }
    />
  );
};

export const DateOfBirth = withJsonFormsControlProps(UIComponent);
