import React from 'react';
import { AutocompleteMulti } from './AutocompleteMulti';
import { HierarchicalOption } from '@common/utils';

interface HierarchicalOptionAutocompleteMultiProps {
  /** The flattened hierarchy in display order — see getHierarchicalOptions */
  options: HierarchicalOption[];
  /** The TICKED option ids (the expanded set, not the stored minimal one) */
  values: string[];
  onChange?: (optionIds: string[]) => void;
  width?: string;
  disabled?: boolean;
  /** Props for the text input, e.g. a label for filter usage */
  inputProps?: React.ComponentProps<typeof AutocompleteMulti>['inputProps'];
}

/**
 * Autocomplete over a flattened option hierarchy where ANY NUMBER of options
 * can be picked — the MULTI_OPTION sibling of
 * {@link HierarchicalOptionAutocomplete}. Parent levels render as indented,
 * bold group levels and are selectable in their own right: a MULTI_OPTION
 * value may hold a parent, which stands for its whole subtree.
 *
 * It renders exactly what it is given: the caller owns the tick rule (ticking
 * a parent ticks its children — `applyOptionToggle`) and the conversion
 * between the ticked set and the minimal set that gets stored
 * (`expandStoredOptionIds` / `collapseToStoredOptionIds`), because those are
 * value semantics rather than control behaviour.
 */
export const HierarchicalOptionAutocompleteMulti = ({
  options,
  values,
  onChange,
  width,
  disabled,
  inputProps,
}: HierarchicalOptionAutocompleteMultiProps) => {
  const selected = options.filter(option => values.includes(option.id));

  return (
    <AutocompleteMulti
      width={width}
      options={options}
      value={selected}
      getOptionLabel={option => option.name}
      isOptionEqualToValue={(option, v) => option.id === v.id}
      // Picked options stay in the list so a parent and its children can be
      // ticked and unticked in one pass.
      disableCloseOnSelect
      filterSelectedOptions={false}
      renderOption={(props, option) => (
        <li
          {...props}
          key={option.id}
          style={{
            paddingLeft: 16 + option.depth * 20,
            fontWeight: option.isLeaf ? undefined : 600,
          }}
        >
          {option.name}
        </li>
      )}
      disabled={disabled}
      onChange={
        onChange
          ? (_e, picked) => onChange(picked.map(option => option.id))
          : undefined
      }
      inputProps={inputProps}
    />
  );
};
