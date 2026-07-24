import type { Column } from '../../ui/elements/table/DataTable';
import type { CustomFieldDefinition } from './invoiceCustomFieldsResource';

// List property columns (spec/prescriptions § list custom-field columns;
// AC-CF4): one column per configured custom field, reading each row's
// customFields blob. Shared by any invoice list that shows properties.

type WithCustomFields = { customFields?: unknown };

const readValue = (row: WithCustomFields, key: string): unknown => {
  const blob = row.customFields;
  return blob && typeof blob === 'object'
    ? (blob as Record<string, unknown>)[key]
    : undefined;
};

// Resolve a stored value to display text: an OPTION value is the option's id →
// its name; other types render their scalar. Empty when unset.
const displayValue = (
  definition: CustomFieldDefinition,
  value: unknown
): string => {
  if (value == null) return '';
  if (definition.valueType === 'OPTION') {
    const option = definition.options.find(o => o.id === value);
    return option?.name ?? String(value);
  }
  if (definition.valueType === 'BOOLEAN') return value ? '✓' : '';
  return String(value);
};

export const buildCustomFieldColumns = <Row extends WithCustomFields>(
  definitions: readonly CustomFieldDefinition[]
): Column<Row, never>[] =>
  definitions.map(definition => ({
    c: {
      accessor: (row: Row) =>
        displayValue(definition, readValue(row, definition.key)),
      // A stable, collision-proof column id per property key.
      id: `customField.${definition.key}`,
    },
    header: definition.name || definition.key,
  }));
