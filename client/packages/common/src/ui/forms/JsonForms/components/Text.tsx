import React, { useEffect, useState } from 'react';
import { ControlProps, rankWith, schemaTypeIs } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import {
  DetailInputWithLabelRow,
  useDebounceCallback,
} from '@openmsupply-client/common';
import { FORM_LABEL_WIDTH } from '../styleConstants';

export const stringTester = rankWith(3, schemaTypeIs('string'));

const UIComponent = (props: ControlProps) => {
  const { data, handleChange, label, path, errors } = props;
  const [localData, setLocalData] = useState<string | undefined>(data);
  // timestamp of the last key stroke
  const [latestKey, setLatestKey] = useState<number>(0);
  const error = !!errors;
  // debounce avoid rerendering the form on every key stroke which becomes a performance issue
  const onChange = useDebounceCallback(
    (value: string) =>
      handleChange(path, error && value === '' ? undefined : value),
    [path, error]
  );

  const examples = (props.schema as Record<string, string[]>)['examples'];

  useEffect(() => {
    // Using debounce, the actual data is set after 500ms after the last key stroke (localDataTime).
    // If data is set from the outside, e.g. through a reset, we want to update our local data as
    // well.
    // To distinguish between debounced events and external data updates we only take data that
    // comes in at least 500ms after the last key stoke, i.e. it must be set from the outside.
    if (Date.now() > latestKey + 500) {
      setLocalData(data);
    }
  }, [data]);

  if (!props.visible) {
    return null;
  }

  const width = props.uischema?.options?.['width'] ?? '100%';

  return (
    <DetailInputWithLabelRow
      label={label}
      inputProps={{
        value: localData ?? '',
        sx: { margin: 0.5, width },
        onChange: e => {
          setLatestKey(Date.now());
          setLocalData(e.target.value);
          onChange(e.target.value);
        },
        disabled: !props.enabled,
        error,
        helperText:
          errors && examples ? `Use e.g.: "${examples.join('", "')}"` : errors,
        FormHelperTextProps: error
          ? { sx: { color: 'error.main' } }
          : undefined,
        required: props.required,
      }}
      labelWidthPercentage={FORM_LABEL_WIDTH}
    />
  );
};

export const TextField = withJsonFormsControlProps(UIComponent);
