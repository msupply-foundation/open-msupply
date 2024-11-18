import React, { useEffect } from 'react';
import { z } from 'zod';
import { ControlProps, rankWith, subErrorsAt, uiTypeIs } from '@jsonforms/core';
import {
  Box,
  DetailInputWithLabelRow,
  Link,
  NumUtils,
  NumericTextInput,
  RouteBuilder,
  Typography,
  extractProperty,
  useDebounceCallback,
  useTranslation,
} from '@openmsupply-client/common';
import { FORM_LABEL_WIDTH, useZodOptionsValidation } from '../../common';
import { useJsonForms, withJsonFormsControlProps } from '@jsonforms/react';
import { useJSONFormsCustomError } from '../../common/hooks/useJSONFormsCustomError';
import { usePrescription } from 'packages/invoices/src/Prescriptions/api';
import { AppRoute } from 'packages/config/src';
import { StockItemSearchInput } from 'packages/system/src';

export const prescriptionTester = rankWith(10, uiTypeIs('Prescription'));

type BloodPressureData = {
  systolic?: number;
  diastolic?: number;
};

const Options = z.object({ prescriptionIdPath: z.string() }).strict();
type Options = z.infer<typeof Options>;

const UIComponent = (props: ControlProps) => {
  const t = useTranslation();
  const {
    data: invoiceLineId,
    handleChange,
    label,
    path,
    schema,
    uischema,
  } = props;
  const { errors, options } = useZodOptionsValidation(
    Options,
    uischema.options
  );

  const { core } = useJsonForms();

  const prescriptionIdPath = options?.prescriptionIdPath;

  const prescriptionId = extractProperty(core?.data, prescriptionIdPath ?? '');

  const { data: prescription, isLoading } =
    usePrescription.document.getById(prescriptionId);

  const { customError, setCustomError } = useJSONFormsCustomError(
    path,
    'Prescription'
  );

  // useEffect(() => {
  //   console.log('PATH', path);
  //   handleChange(path, 'TEMP_ID');
  //   // handleChange(path, '4688726d-88c8-4af0-a000-f70961c9dd19');
  // }, []);

  console.log('prescription', prescription);
  console.log('prescriptionIdPath', prescriptionIdPath);
  console.log('prescriptionId', prescriptionId);

  console.log('invoiceLineId', invoiceLineId);
  console.log('core', core);

  // useEffect(() => {
  //   if (core) {
  //     const getChildErrors = subErrorsAt(path, schema);
  //     const errors = getChildErrors(core);
  //     setCustomError(errors[0]?.message);
  //   }
  // }, [core]);

  const onChange = useDebounceCallback(
    (value: BloodPressureData) => {
      if (value.diastolic === undefined && value.systolic === undefined) {
        handleChange(path, undefined);
      } else {
        handleChange(path, value);
      }
    },
    [path]
  );

  if (!props.visible) {
    return null;
  }

  const invoiceLine = invoiceLineId
    ? prescription?.lines.nodes.find(line => line.id === invoiceLineId)
    : null;

  if (prescription)
    return (
      <>
        <Link
          to={RouteBuilder.create(AppRoute.Dispensary)
            .addPart(AppRoute.Prescription)
            .addPart(String(prescription?.invoiceNumber))
            .build()}
        >
          Prescription
        </Link>
        {invoiceLine && <Typography>{invoiceLine.itemName}</Typography>}
      </>
    );

  return (
    <>
      <StockItemSearchInput onChange={() => {}} />
    </>
  );

  return <p>This is the prescription renderer</p>;

  return (
    <DetailInputWithLabelRow
      label={label}
      labelWidthPercentage={FORM_LABEL_WIDTH}
      inputAlignment="start"
      sx={{ paddingTop: 1 }}
      Input={
        <Box display="flex" flexDirection="column">
          <Box display="flex" flexDirection="row" paddingLeft={0.5}>
            <NumericTextInput
              onChange={value => {
                const newBP = {
                  ...bloodPressure,
                  systolic: value,
                };
                setBloodPressure(newBP);
                onChange(newBP);
              }}
              value={bloodPressure?.systolic}
              label={t('label.systolic')}
              min={schema.properties?.['systolic']?.minimum ?? 0}
              max={
                schema.properties?.['systolic']?.maximum ??
                NumUtils.MAX_SAFE_API_INTEGER
              }
              {...inputProps}
            />
            <Typography margin={1} paddingTop={2}>
              /
            </Typography>
            <NumericTextInput
              onChange={value => {
                const newBP = {
                  ...bloodPressure,
                  diastolic: value,
                };
                setBloodPressure(newBP);
                onChange(newBP);
              }}
              value={bloodPressure?.diastolic}
              label={t('label.diastolic')}
              width={100}
              min={schema.properties?.['diastolic']?.minimum ?? 0}
              max={
                schema.properties?.['diastolic']?.maximum ??
                NumUtils.MAX_SAFE_API_INTEGER
              }
              {...inputProps}
            />
          </Box>
          <Box display="flex" flexDirection="row" alignSelf="center">
            {customError && (
              <Typography variant="caption">{customError}</Typography>
            )}
          </Box>
        </Box>
      }
    />
  );
};

export const Prescription = withJsonFormsControlProps(UIComponent);
