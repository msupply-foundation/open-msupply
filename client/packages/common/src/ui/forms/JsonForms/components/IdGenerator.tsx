import React, { useCallback, useMemo } from 'react';
import {
  composePaths,
  ControlProps,
  rankWith,
  uiTypeIs,
} from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import {
  BasicTextInput,
  Box,
  useDocument,
  useMutation,
  useTranslation,
} from '@openmsupply-client/common';
import { Button, FormLabel } from '@mui/material';
import {
  FORM_LABEL_COLUMN_WIDTH,
  FORM_INPUT_COLUMN_WIDTH,
} from '../styleConstants';
import { JsonFormsConfig } from '../JsonForm';

export const idGeneratorTester = rankWith(10, uiTypeIs('IdGenerator'));

type GeneratorOptions = {
  targetField: string;
  parts: Part[];
};

/**
 * Declaration type to specify what to do with a given string.
 * Only one value should be set in a single StringMutation.
 * If multiple fields are set its undefined which one is applied.
 * To apply multiple string mutations multiple StringMutation are needed (mutations array in Part).
 */
type StringMutation = {
  /** Take first N chars from the string */
  firstNChars?: number;
  /** Take last N chars from the string */
  lastNChars?: number;
  /** Convert the string to upper case */
  toUpperCase?: boolean;
  /** Compares the string to the keys in the map and replaces it with the value of the map */
  mapping?: Record<string, string>;
  /**
   * Uses the pad string and "overlays" the input string on top,
   * e.g. padString = "00000" and input = "156" results in "00156"
   */
  padString?: string;
};

/** Takes a string from a field in the data */
type FieldPart = {
  type: 'Field';
  /** Name of the field (if type is FIELD) */
  field: string | string[];
  /** String mutations applied in sequence */
  mutations: StringMutation[];
};

/** Uses the store code */
type StoreCodePart = {
  type: 'StoreCode';
  /** String mutations applied in sequence */
  mutations: StringMutation[];
};

/** Uses the store name */
type StoreNamePart = {
  type: 'StoreName';
  /** String mutations applied in sequence */
  mutations: StringMutation[];
};

/** Uses a number counter */
type NumberPart = {
  type: 'Number';
  /** Name of the number counter (if type is NUMBER) */
  numberName: string;
  /** String mutations applied in sequence */
  mutations: StringMutation[];
};

type Part = FieldPart | StoreCodePart | StoreNamePart | NumberPart;

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
    if (part.type !== 'Field') {
      continue;
    }
    const field = extractField(data, part.field);
    const fieldName =
      typeof part.field === 'string' ? part.field : part.field.join('.');
    if (field === undefined || typeof field !== 'string' || field === '') {
      return `Missing required field: ${fieldName}`;
    }
  }
};

const mutateString = (value: string, part: StringMutation): string => {
  if (part.mapping) {
    const replacement = part.mapping[value];
    if (replacement !== undefined) {
      return replacement;
    }
  }
  if (part.firstNChars !== undefined) {
    return value.slice(0, part.firstNChars);
  }
  if (part.lastNChars !== undefined) {
    return value.slice(value.length - part.lastNChars);
  }
  if (part.toUpperCase) {
    return value.toLocaleUpperCase();
  }
  if (part.padString) {
    return value.padStart(part.padString.length, part.padString);
  }
  return value;
};

const valueFromPart = async (
  { data, config, allocateNumber }: Omit<GenerateIdInput, 'options'>,
  part: Part
): Promise<string | undefined> => {
  switch (part.type) {
    case 'Field': {
      const field = extractField(data, part.field);
      if (field === undefined || typeof field !== 'string') {
        return undefined;
      }
      return field;
    }
    case 'StoreCode': {
      return config.store?.code;
    }
    case 'StoreName': {
      return config.store?.name;
    }
    case 'Number': {
      return `${await allocateNumber(part.numberName)}`;
    }
  }
};

type GenerateIdInput = {
  options: GeneratorOptions;
  data: Record<string, unknown>;
  config: JsonFormsConfig;
  allocateNumber: (numberName: string) => Promise<number>;
};

const generateId = async (input: GenerateIdInput): Promise<string> => {
  let output = '';
  for (const part of input.options.parts ?? []) {
    const value = await valueFromPart(input, part);
    if (value === undefined) {
      continue;
    }
    // apply mutations in sequence
    output += part.mutations.reduce(
      (value: string, mutation: StringMutation) =>
        mutateString(value, mutation),
      value
    );
  }
  return output;
};

const UIComponent = (props: ControlProps) => {
  const { label, path, data, visible, handleChange, uischema, config } = props;
  const t = useTranslation('common');
  const options = uischema.options as GeneratorOptions | undefined;
  const { mutateAsync: mutateGenerateId } = useMutation(
    async (input: GenerateIdInput): Promise<string> => generateId(input)
  );
  const { mutateAsync: allocateNumber } = useDocument.utils.allocateNumber();

  const generate = useCallback(async () => {
    if (!options) {
      return;
    }
    const id = await mutateGenerateId({
      options,
      data,
      config,
      allocateNumber,
    });
    const fullPath = composePaths(path, options?.targetField);
    handleChange(fullPath, id);
  }, [options, path, data, handleChange]);

  const value = options?.targetField ? data[options?.targetField] : undefined;

  const error = useMemo(() => {
    if (!options) {
      return;
    }
    return validateFields(options, data);
  }, [options, data, value]);

  if (!visible) {
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
        <BasicTextInput disabled={true} value={value} style={{ flex: 1 }} />

        <Box>
          <Button disabled={!!error} onClick={generate} variant="outlined">
            {t('label.generate')}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export const IdGenerator = withJsonFormsControlProps(UIComponent);
