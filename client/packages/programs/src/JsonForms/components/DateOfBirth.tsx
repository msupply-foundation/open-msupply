import React, { useEffect } from 'react';
import {
  rankWith,
  ControlProps,
  uiTypeIs,
  composePaths,
} from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import {
  DateUtils,
  useFormatDateTime,
  useTranslation,
  FormLabel,
  Box,
  DetailInputWithLabelRow,
  NumericTextInput,
  Typography,
  LocaleKey,
  DateTimePickerInput,
} from '@openmsupply-client/common';
import { z } from 'zod';

import {
  DefaultFormRowSx,
  FORM_GAP,
  FORM_LABEL_WIDTH,
  useZodOptionsValidation,
} from '../common';
import { useJSONFormsCustomError } from '../common/hooks/useJSONFormsCustomError';
import { PickersActionBarAction } from '@mui/x-date-pickers';

const Options = z
  .object({
    hideClear: z.boolean().optional(),
  })
  .strict()
  .optional();

type Options = z.input<typeof Options>;

export const dateOfBirthTester = rankWith(10, uiTypeIs('DateOfBirth'));

const UIComponent = (props: ControlProps) => {
  const { data, handleChange, label, path, uischema, errors } = props;
  const [age, setAge] = React.useState<number | undefined>();
  const [dob, setDoB] = React.useState<Date | null>(null);
  const t = useTranslation();
  const formatDateTime = useFormatDateTime();
  const { options } = useZodOptionsValidation(Options, uischema.options);
  const { customError, setCustomError } = useJSONFormsCustomError(
    path,
    'Date of Birth'
  );

  const actions: PickersActionBarAction[] = options?.hideClear
    ? ['accept']
    : ['clear', 'accept'];

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
    const naiveDoB = DateUtils.getNaiveDate(data.dateOfBirth);
    setDoB(naiveDoB);
    if (naiveDoB === null) {
      setAge(undefined);
      return;
    }
    setAge(DateUtils.age(naiveDoB));
  }, [data]);

  if (!props.visible) {
    return null;
  }

  return (
    <DetailInputWithLabelRow
      sx={DefaultFormRowSx}
      label={t(label as LocaleKey)}
      labelWidthPercentage={FORM_LABEL_WIDTH}
      inputAlignment={'start'}
      Input={
        <Box
          display="flex"
          alignItems="center"
          columnGap={FORM_GAP}
          rowGap="2px"
          width="100%"
          flexWrap="wrap"
        >
          <DateTimePickerInput
            // undefined is displayed as "now" and null as unset
            value={dob}
            onChange={onChangeDoB}
            format="P"
            width={145}
            disableFuture
            disabled={!props.enabled}
            onError={validationError =>
              setCustomError(validationError ?? undefined)
            }
            error={customError || errors}
            actions={actions}
          />

          <Box display="flex" gap={1}>
            <Box flex={0} style={{ textAlign: 'end' }}>
              <FormLabel sx={{ fontWeight: 'bold' }}>
                {t('label.age')}:
              </FormLabel>
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
                {formatDateTime.getDisplayAge(dob)}
              </Typography>
            )}
          </Box>
        </Box>
      }
    />
  );
};

export const DateOfBirth = withJsonFormsControlProps(UIComponent);
