/* eslint-disable valid-jsdoc */
import React, { useEffect, useState } from 'react';
import {
  BasicTextInput,
  StandardTextFieldProps,
  useDebounceCallback,
} from '@openmsupply-client/common';

export type DebouncedTextInputProps = {
  data: string;
  onChange: (value: string | undefined) => void;
  inputProps: StandardTextFieldProps;
};

/**
 * JSONForms specific text input for debounced text input.
 *
 * In a JSONForm component the data prop changes after every user input.
 * For text input this can lead to performance issues which is mitigated by debouncing the input
 * events.
 *
 * However, there are two problem with debounced inputs which this component solves:
 * First, when the user is still typing while a debounced event arrives the input field is updated
 * to an old value effectively reverting user input done in the meantime.
 * This is solved by caching the user input and only displaying this local cached data.
 * Secondly, there are cases where the form data is updated without user input, e.g. when resetting
 * the form to the initial data.
 * If the local cache is not invalidated the form will show the old cached value.
 * This problem is solved by having a time based heuristic to determine if the data has been changed
 * by the user or if it is changed from the outside in which case the local cache is reset.
 *
 */
export const DebouncedTextInput = (
  props: DebouncedTextInputProps
): React.ReactElement => {
  const { data, onChange, inputProps } = props;
  const [localData, setLocalData] = useState<string | undefined>(data);
  // timestamp of the last key stroke
  const [latestKey, setLatestKey] = useState<number>(0);
  // debounce avoid rerendering the form on every key stroke which becomes a performance issue
  const onChangeDebounced = useDebounceCallback(
    (value: string) =>
      onChange(inputProps.error && value === '' ? undefined : value),
    [inputProps.error, onChange]
  );

  useEffect(() => {
    // Using debounce, the actual data is set after 500ms after the last key stroke (localDataTime).
    // If data is set from the outside, e.g. through a reset, we want to update our local data as
    // well.
    // To distinguish between debounced events and external data updates we only take data that
    // comes in at least 500ms after the last key stoke, i.e. it must be set from the outside or
    // from the last debounced event.
    if (Date.now() > latestKey + 500) {
      setLocalData(data);
    }
  }, [data]);
  return (
    <BasicTextInput
      {...inputProps}
      value={localData ?? ''}
      onChange={e => {
        setLatestKey(Date.now());
        setLocalData(e.target.value);
        onChangeDebounced(e.target.value);
      }}
    />
  );
};
