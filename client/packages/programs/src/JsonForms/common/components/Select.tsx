import React from 'react';
import { rankWith, isEnumControl, ControlProps } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { FormLabel, Box } from '@mui/material';
import { Autocomplete } from '@openmsupply-client/common';
import {
  FORM_LABEL_COLUMN_WIDTH,
  FORM_INPUT_COLUMN_WIDTH,
} from '../styleConstants';
import { z } from 'zod';
import { useZodOptionsValidation } from '../useZodOptionsValidation';
import parse from 'autosuggest-highlight/parse';
import match from 'autosuggest-highlight/match';

export const selectTester = rankWith(4, isEnumControl);

type Options = {
  /**
   * Option to set a display name and/or reorder enum item.
   *
   * For example, enum [YES, NO] can be displayed as [No, Yes] using:
   * "show": [
   *   ["NO", "No"],
   *   ["YES", "Yes"]
   * ]
   *
   * To only reorder the enum to [NO, YES] do:
   * "show": [
   *   ["NO"],
   *   ["YES"]
   * ]
   */
  show?: [string, string | undefined, ...(string | undefined)[]][];
  /**
   * Show three columns.
   * For example,
   * "show": [
   *   ["FIRST", "First", "Description", "Right"],
   *   ["SECOND", "Second", undefined, "Right2"],
   * ]
   * would show:
   * "First     Description   Right"
   * "Second                 Right2"
   */
  multiColumn?: boolean;
};
const Options: z.ZodType<Options | undefined> = z
  .object({
    show: z
      .array(
        z.tuple([z.string(), z.string().optional()]).rest(z.string().optional())
      )
      .optional(),
    multiColumn: z.boolean().optional(),
  })
  .strict()
  .optional();

type DisplayOption = {
  label: string;
  value: string;
  description?: string;
  right?: string;
};

const getDisplayOptions = (
  schemaEnum: string[],
  options?: Options
): DisplayOption[] => {
  if (!options?.show) {
    return schemaEnum.map((option: string) => ({
      label: option,
      value: option,
    }));
  }

  return options.show.reduce<DisplayOption[]>(
    (prev, [key, value, description, right]) => {
      if (!schemaEnum.includes(key)) {
        console.warn(
          `Invalid select control config: key ${key} is not in the enum`
        );
        return prev;
      }
      prev.push({ value: key, label: value ?? key, description, right });
      return prev;
    },
    []
  );
};

const searchRanking = {
  STARTS_WITH: 2,
  CONTAINS: 1,
  NO_MATCH: 0,
} as const;

const filterOptions = (
  options: DisplayOption[],
  { inputValue }: { inputValue: string }
) => {
  const searchTerm = inputValue.toLowerCase();
  const filteredOptions = options
    .map(option => {
      const lowerCaseOption = `${option.label} ${option.description ?? ''} ${
        option.right ?? ''
      }`.toLowerCase();

      const rank = lowerCaseOption.startsWith(searchTerm)
        ? searchRanking.STARTS_WITH
        : lowerCaseOption.includes(searchTerm)
        ? searchRanking.CONTAINS
        : searchRanking.NO_MATCH;
      return { ...option, rank };
    })
    .filter(({ rank }) => rank !== searchRanking.NO_MATCH)
    .sort((a, b) => b.rank - a.rank);

  return filteredOptions;
};

const TextHighlight = (props: {
  parts: {
    text: string;
    highlight: boolean;
  }[];
}) => {
  return (
    <div>
      {props.parts.map((part, index) => (
        <span
          key={index}
          style={{
            fontWeight: part.highlight ? 600 : 400,
          }}
        >
          {part.text}
        </span>
      ))}
    </div>
  );
};

const getOptionLabel = (option: DisplayOption) =>
  option.description
    ? `${option.label}     ${option.description ?? ''}`
    : `${option.label}`;

const getHighlightParts = (
  value: DisplayOption | undefined | null,
  option: string | undefined,
  inputValue: string
) => {
  // check if text input equals the selected value
  if (value && getOptionLabel(value) === inputValue) {
    return [
      {
        text: option ?? '',
        highlight: false,
      },
    ];
  }
  return parse(
    option ?? '',
    match(option ?? '', inputValue, {
      insideWords: true,
    })
  );
};

const UIComponent = (props: ControlProps) => {
  const { data, handleChange, label, schema, path, uischema, enabled } = props;
  const { errors: zErrors, options: schemaOptions } = useZodOptionsValidation(
    Options,
    uischema.options
  );
  if (!props.visible) {
    return null;
  }
  const onChange = (
    _event: React.SyntheticEvent,
    value: DisplayOption | null
  ) => handleChange(path, value?.value);
  const options = schema.enum
    ? getDisplayOptions(schema.enum, schemaOptions)
    : [];
  const value = data ? options.find(o => o.value === data) : null;

  return (
    <Box
      display="flex"
      alignItems="center"
      gap={2}
      justifyContent="space-around"
      style={{ minWidth: 300 }}
      margin={0.5}
      marginLeft={0}
    >
      <Box style={{ textAlign: 'end' }} flexBasis={FORM_LABEL_COLUMN_WIDTH}>
        <FormLabel sx={{ fontWeight: 'bold' }}>{label}:</FormLabel>
      </Box>
      <Box flexBasis={FORM_INPUT_COLUMN_WIDTH} justifyContent="flex-start">
        <Autocomplete
          sx={{ '.MuiFormControl-root': { minWidth: '100%' } }}
          options={options}
          disabled={!enabled}
          value={value}
          onChange={onChange}
          filterOptions={filterOptions}
          getOptionLabel={getOptionLabel}
          renderOption={(props, option, { inputValue }) => {
            const parts = getHighlightParts(value, option.label, inputValue);

            if (schemaOptions?.multiColumn) {
              const descriptionParts = getHighlightParts(
                value,
                option.description,
                inputValue
              );
              const rightParts = getHighlightParts(
                value,
                option.right,
                inputValue
              );
              return (
                <li {...props} key={option.value}>
                  <span
                    style={{ whiteSpace: 'nowrap', width: 100, minWidth: 50 }}
                  >
                    <TextHighlight {...props} parts={parts} />
                  </span>
                  <span
                    style={{
                      whiteSpace: 'normal',
                      width: 500,
                    }}
                  >
                    <TextHighlight {...props} parts={descriptionParts} />
                  </span>
                  <span
                    style={{
                      width: 200,
                      textAlign: 'right',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <TextHighlight {...props} parts={rightParts} />
                  </span>
                </li>
              );
            } else {
              return (
                <li {...props} key={option.value}>
                  <TextHighlight parts={parts} />
                </li>
              );
            }
          }}
          clearable={!props.config?.required}
          inputProps={{
            error: !!zErrors || !!props.errors,
            helperText: zErrors ?? props.errors,
          }}
          isOptionEqualToValue={option => option.value === data}
        />
      </Box>
    </Box>
  );
};

export const Selector = withJsonFormsControlProps(UIComponent);
