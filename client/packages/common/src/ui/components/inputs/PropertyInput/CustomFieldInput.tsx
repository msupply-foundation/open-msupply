import React from 'react';
import { BasicTextInput } from '../TextInput';
import { Checkbox } from '../Checkbox';
import {
  HierarchicalOptionAutocomplete,
  HierarchicalOptionAutocompleteMulti,
} from '../Autocomplete';
import { PropertyInput } from './PropertyInput';
import { CustomFieldNodeValueType } from '@common/types';
import { useFormatDateTime } from '@common/intl';
import {
  formatCustomFieldValue,
  getHierarchicalOptions,
  CustomFieldDefinitionLike,
  toLegacyPropertyInput,
  applyOptionToggle,
  collapseToStoredOptionIds,
  expandStoredOptionIds,
  readMultiOptionIds,
} from '@common/utils';

/** A scalar the legacy `PropertyInput` understands. */
type LegacyPropertyValue = string | number | boolean | undefined;
type PropertyValue = LegacyPropertyValue | string[];

interface CustomFieldInputProps {
  /** The customField definition that drives which control is rendered. */
  definition: CustomFieldDefinitionLike;
  /** The current value for this property (from the record's `customFields`). */
  value: unknown;
  /** Supply to make the field editable. When omitted the field is read-only. */
  onChange?: (value: PropertyValue | null) => void;
  disabled?: boolean;
}

/**
 * Renders the single input control for one customFields value, shared across
 * every record kind (item, name, patient, …) so the value-type → control
 * mapping lives in one place. Callers wrap this in their own labelled-row
 * layout.
 *
 * - BOOLEAN renders as a checkbox in both modes (disabled when read-only).
 * - OPTION renders as an id-aware Autocomplete of the option hierarchy: parent
 *   levels are indented, non-selectable headers and only leaves can be picked
 *   (flat dimensions are a plain list). The stored value is the leaf option id.
 *   Read-only is the same control, disabled — so display and edit stay in sync.
 * - MULTI_OPTION renders the same hierarchy as a multi-select: any node can be
 *   picked, ticking a parent ticks its subtree, and what gets stored is the
 *   MINIMAL covering set (all children ticked → the parent alone). The control
 *   holds the expanded set; the conversion is `expandStoredOptionIds` /
 *   `collapseToStoredOptionIds`.
 * - TEXT/INTEGER/REAL/DATE render via the shared legacy `PropertyInput` when
 *   editable, otherwise as a disabled text row.
 */
export const CustomFieldInput = ({
  definition,
  value,
  onChange,
  disabled,
}: CustomFieldInputProps) => {
  const { localisedDate } = useFormatDateTime();
  const editable = !!onChange;

  if (definition.valueType === CustomFieldNodeValueType.Boolean) {
    return (
      <Checkbox
        checked={Boolean(value)}
        disabled={disabled || !editable}
        onChange={editable ? e => onChange?.(e.target.checked) : undefined}
      />
    );
  }

  if (definition.valueType === CustomFieldNodeValueType.Option) {
    // Whole hierarchy in display order: parent levels render as indented,
    // non-selectable headers; only leaves can be picked. Flat dimensions come
    // back as a plain depth-0 list (every option selectable).
    const hierarchical = getHierarchicalOptions(definition);
    const existing = definition.options.find(o => o.id === value) ?? null;
    // Always keep the current value selectable, even if it's a non-leaf, a
    // not-yet-synced id, or an option since deleted, so an existing value still
    // shows. A deleted option reaches the list only this way — via the value
    // already on the record — so it is never offered to a record that doesn't
    // already hold it.
    const options =
      existing && !hierarchical.some(o => o.id === existing.id)
        ? [{ ...existing, depth: 0, isLeaf: true }, ...hierarchical]
        : hierarchical;

    return (
      <HierarchicalOptionAutocomplete
        width="100%"
        options={options}
        value={typeof value === 'string' ? value : null}
        disabled={disabled || !editable}
        clearable={editable}
        onChange={editable ? id => onChange?.(id) : undefined}
      />
    );
  }

  if (definition.valueType === CustomFieldNodeValueType.MultiOption) {
    const hierarchical = getHierarchicalOptions(definition);
    const stored = readMultiOptionIds(value);
    // Ids with no option row (deleted before ever syncing) can't be listed, so
    // they can't be unticked; carrying them through keeps an unrelated edit
    // from silently dropping a value the user can't see.
    const listed = new Set(definition.options.map(o => o.id));
    const unlisted = stored.filter(id => !listed.has(id));
    const ticked = expandStoredOptionIds(definition, stored);

    return (
      <HierarchicalOptionAutocompleteMulti
        width="100%"
        options={hierarchical}
        values={ticked}
        disabled={disabled || !editable}
        onChange={
          editable
            ? picked =>
                onChange?.([
                  ...collapseToStoredOptionIds(
                    definition,
                    applyOptionToggle(definition, ticked, picked)
                  ),
                  ...unlisted,
                ])
            : undefined
        }
      />
    );
  }

  const legacy = editable ? toLegacyPropertyInput(definition.valueType) : null;
  if (legacy && onChange) {
    return (
      <PropertyInput
        valueType={legacy.valueType}
        value={(value as LegacyPropertyValue) ?? null}
        disabled={disabled}
        onChange={v => onChange(v ?? null)}
      />
    );
  }

  // Read-only: a disabled text row showing the formatted value.
  return (
    <BasicTextInput
      disabled
      fullWidth
      value={formatCustomFieldValue(definition, value, localisedDate)}
    />
  );
};
