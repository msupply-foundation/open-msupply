import React, { useCallback, useMemo } from 'react';
import {
  composePaths,
  ControlProps,
  rankWith,
  uiTypeIs,
} from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { BasicTextInput, Box } from '@openmsupply-client/common';
import { Button, FormLabel } from '@mui/material';
import {
  FORM_LABEL_COLUMN_WIDTH,
  FORM_INPUT_COLUMN_WIDTH,
} from '../styleConstants';

export const idGeneratorTester = rankWith(4, uiTypeIs('IdGeneratorControl'));

type GeneratorOptions = {
  targetField: string;
  parts: Part[];
};

type Part = {
  field: string | string[];
  firstNChars?: number;
  lastNChars?: number;
  toUpperCase?: boolean;
  enumMapping?: Record<string, string>;
};

const extractField = (
  data: any,
  field: string | string[]
): unknown | undefined => {
  const fields = typeof field === 'string' ? [field] : field;
  return fields.reduce((prev, field) => {
    return prev?.[field];
  }, data);
};

const validateFields = (
  options: GeneratorOptions,
  data: Record<string, unknown>
): string | undefined => {
  for (const part of options.parts ?? []) {
    const field = extractField(data, part.field);
    const fieldName =
      typeof part.field === 'string' ? part.field : part.field.join('.');
    if (field === undefined || typeof field !== 'string' || field === '') {
      return `Missing required field: ${fieldName}`;
    }
  }
};

const generateId = (options: GeneratorOptions, data: Record<string, unknown>): string => {
  let output = '';
  for (const part of options.parts ?? []) {
    const field = extractField(data, part.field);
    if (field === undefined || typeof field !== 'string') {
      continue;
    }
    let strPart = field;
    if (part.enumMapping) {
      const replacement = part.enumMapping[strPart];
      if (replacement !== undefined) {
        strPart = replacement;
      }
    }
    if (part.firstNChars !== undefined) {
      strPart = field.slice(0, part.firstNChars);
    }
    if (part.lastNChars !== undefined) {
      strPart = field.slice(field.length - part.lastNChars);
    }
    if (part.toUpperCase) {
      strPart = strPart.toLocaleUpperCase();
    }

    output += strPart;
  }
  return output;
};

const UIComponent = (props: ControlProps) => {
  const { label } = props;
  const options = props.uischema.options as GeneratorOptions | undefined;
  const generate = useCallback(() => {
    if (!options) {
      return;
    }
    const id = generateId(options, props.data);
    const path = composePaths(props.path, options?.targetField);
    props.handleChange(path, id);
  }, [options, props.path, props.data]);

  const value = options?.targetField
    ? props.data[options?.targetField]
    : undefined;

  const error = useMemo(() => {
    if (!options) {
      return;
    }
    return validateFields(options, props.data);
  }, [options, props.data, value]);

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
      <Box
        flex={1}
        style={{ textAlign: 'end' }}
        flexBasis={FORM_LABEL_COLUMN_WIDTH}
      >
        <FormLabel sx={{ fontWeight: 'bold' }}>{label}:</FormLabel>
      </Box>
      <Box
        flex={1}
        flexBasis={FORM_INPUT_COLUMN_WIDTH}
        display="flex"
        alignItems="center"
        gap={2}
      >
        <BasicTextInput disabled={true} value={value} />

        <Box flex={0}>
          <Button disabled={!!error} onClick={generate} variant="outlined">
            Generate
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export const IdGenerator = withJsonFormsControlProps(UIComponent);
