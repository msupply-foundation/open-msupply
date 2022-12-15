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
  useMutation,
  useTranslation,
  useConfirmationModal,
} from '@openmsupply-client/common';
import {
  FORM_LABEL_COLUMN_WIDTH,
  FORM_INPUT_COLUMN_WIDTH,
  JsonFormsConfig,
  useZodOptionsValidation,
} from '@openmsupply-client/programs';
import { Button, FormLabel } from '@mui/material';
import { get as extractProperty } from 'lodash';
import { useDocument } from '@openmsupply-client/programs';
import { z } from 'zod';

export const idGeneratorTester = rankWith(10, uiTypeIs('IdGenerator'));

type GeneratorOptions = {
  targetField: string;
  parts: Part[];
  /*
  Regeneration behaviour:
  - By default, after ID is first saved, a confirmation will be displayed
    whenever the user subsequently clicks the "Generate" button
  - This can be suppressed by setting the "confirmRegenerate" option to `false`
    (default `true`)
  */
  confirmRegenerate?: boolean;
  /*
  - To prevent the ID from *ever* being regenerated after first save, set the
  "preventRegenAfterSave" option to `true` (default `false`)
  */
  preventRegenerate?: boolean;
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

const StringMutation: z.ZodType<StringMutation> = z
  .object({
    firstNChars: z.number().optional(),
    lastNChars: z.number().optional(),
    toUpperCase: z.boolean().optional(),
    mapping: z.record(z.string()).optional(),
    padString: z.string().optional(),
  })
  .strict();

const Part: z.ZodType<Part> = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('Field'),
    field: z.union([z.string(), z.array(z.string())]),
    mutations: z.array(StringMutation),
  }),
  z.object({
    type: z.literal('StoreCode'),
    mutations: z.array(StringMutation),
  }),
  z.object({
    type: z.literal('StoreName'),
    mutations: z.array(StringMutation),
  }),
  z.object({
    type: z.literal('Number'),
    numberName: z.string(),
    mutations: z.array(StringMutation),
  }),
]);

const GeneratorOptions: z.ZodType<GeneratorOptions> = z
  .object({
    targetField: z.string(),
    parts: z.array(Part),
    confirmRegenerate: z.boolean().optional().default(true),
    preventRegenerate: z.boolean().optional().default(false),
  })
  .strict();

const validateFields = (
  options: GeneratorOptions,
  data: Record<string, unknown>
): string | undefined => {
  for (const part of options.parts ?? []) {
    if (part.type !== 'Field') {
      continue;
    }
    const field = extractProperty(data, part.field);
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
      const field = extractProperty(data, part.field);
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
  const t = useTranslation(['patients', 'common']);
  const { mutateAsync: mutateGenerateId } = useMutation(
    async (input: GenerateIdInput): Promise<string> => generateId(input)
  );
  const { mutateAsync: allocateNumber } = useDocument.utils.allocateNumber();

  const { data: savedData } = useDocument.get.documentByName(
    config.documentName
  );

  const { errors, options } = useZodOptionsValidation(
    GeneratorOptions,
    uischema.options
  );

  const canGenerate = !savedData?.data?.code2 || !options?.preventRegenerate;

  const requireConfirmation = !options?.confirmRegenerate
    ? false
    : !!savedData?.data?.code2;

  const value = options?.targetField
    ? extractProperty(data, options.targetField)
    : undefined;
  const validationError = useMemo(() => {
    if (!options) {
      return;
    }
    return validateFields(options, data);
  }, [options, data, value]);
  const error = !!validationError || !!errors;

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

  const confirmRegenerate = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.regenerate-id-confirm'),
    onConfirm: generate,
  });

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
        <BasicTextInput
          disabled={true}
          value={value}
          style={{ flex: 1 }}
          helperText={errors}
        />

        <Box>
          <Button
            disabled={error || !canGenerate}
            onClick={requireConfirmation ? () => confirmRegenerate() : generate}
            variant="outlined"
          >
            {t('label.generate')}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export const IdGenerator = withJsonFormsControlProps(UIComponent);
