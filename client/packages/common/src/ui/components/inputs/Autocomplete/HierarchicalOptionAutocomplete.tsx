import React from 'react';
import { Autocomplete, AutocompleteProps } from './Autocomplete';
import { HierarchicalOption } from '@common/utils';

interface HierarchicalOptionAutocompleteProps {
  /** The flattened hierarchy in display order — see getHierarchicalOptions */
  options: HierarchicalOption[];
  /** The selected option id */
  value: string | null;
  onChange?: (optionId: string | null) => void;
  width?: string;
  disabled?: boolean;
  clearable?: boolean;
  /** Lets the options popover grow wider than the input (it sizes to content,
   * but never narrower than this) — useful when the input is narrow, e.g. filters */
  popperMinWidth?: number;
  /** Props for the text input, e.g. a label for filter usage */
  inputProps?: AutocompleteProps<HierarchicalOption>['inputProps'];
}

/**
 * Autocomplete over a flattened option hierarchy (see getHierarchicalOptions):
 * parent levels render as indented, non-selectable headers and only leaves can
 * be picked. Flat dimensions are a plain list. Shared by the propertiesV2 edit
 * control (PropertyV2Input) and the property filter dropdowns
 * (HierarchicalEnumFilter) so selection and filtering stay in sync.
 */
export const HierarchicalOptionAutocomplete = ({
  options,
  value,
  onChange,
  width,
  disabled,
  clearable = true,
  popperMinWidth,
  inputProps,
}: HierarchicalOptionAutocompleteProps) => {
  const current = options.find(option => option.id === value) ?? null;

  return (
    <Autocomplete
      width={width}
      popperMinWidth={popperMinWidth}
      options={options}
      value={current}
      getOptionLabel={option => option.name}
      getOptionDisabled={option => !option.selectable}
      isOptionEqualToValue={(option, v) => option.id === v.id}
      renderOption={(props, option) => (
        <li
          {...props}
          key={option.id}
          style={{
            paddingLeft: 16 + option.depth * 20,
            fontWeight: option.selectable ? undefined : 600,
            // Headers are dimmed and the MUI disabled styling removes the
            // pointer; keep them readable as group labels.
            opacity: option.selectable ? undefined : 0.85,
          }}
        >
          {option.name}
        </li>
      )}
      disabled={disabled}
      clearable={clearable}
      onChange={
        onChange ? (_e, option) => onChange(option?.id ?? null) : undefined
      }
      inputProps={inputProps}
    />
  );
};
