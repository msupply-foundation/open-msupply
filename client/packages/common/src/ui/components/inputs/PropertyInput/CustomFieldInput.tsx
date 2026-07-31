import React from 'react';
import { BasicTextInput } from '../TextInput';
import { Checkbox } from '../Checkbox';
import { HierarchicalOptionAutocomplete } from '../Autocomplete';
import { PropertyInput } from './PropertyInput';
import { CustomFieldNodeValueType } from '@common/types';
import { useFormatDateTime } from '@common/intl';
import {
  formatCustomFieldValue,
  getHierarchicalOptions,
  CustomFieldDefinitionLike,
  toLegacyPropertyInput,
} from '@common/utils';

type PropertyValue = string | number | boolean | undefined;

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
        onChange={
          editable ? e => onChange?.(e.target.checked) : undefined
        }
      />
    );
  }

  if (definition.valueType === CustomFieldNodeValueType.Option) {
    // Whole hierarchy in display order: parent levels render as indented,
    // non-selectable headers; only leaves can be picked. Flat dimensions come
    // back as a plain depth-0 list (every option selectable).
    const hierarchical = getHierarchicalOptions(definition);
    const existing = definition.options.find(o => o.id === value) ?? null;
    // Always keep the current value selectable, even if it's a non-leaf / a
    // not-yet-synced id, so an existing value still shows.
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

  const legacy = editable ? toLegacyPropertyInput(definition.valueType) : null;
  if (legacy && onChange) {
    return (
      <PropertyInput
        valueType={legacy.valueType}
        value={(value as PropertyValue) ?? null}
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
