import { describe, expect, it } from 'vitest';
import {
  buildDynamicFilter,
  customFieldDisplay,
  customFieldValue,
  parseCustomFields,
  visibleCustomFields,
  type CustomFieldDef,
} from './customFields';

// Slice-2 custom-field surface (spec/names). The reference dataset configures no
// custom fields, so these assert the contract-grounded logic (columns, values,
// dynamicFilter AST); populated live behaviour is a recorded C2 gap.

const def = (over: Partial<CustomFieldDef> = {}): CustomFieldDef => ({
  id: 'cf1',
  key: 'supply_level',
  name: 'Supply level',
  valueType: 'TEXT',
  kind: 'STANDARD',
  displayMode: 'VISIBLE',
  options: [],
  ...over,
});

describe('AC-N18 Custom-field columns when configured', () => {
  it('reads a field value out of the customFields JSON object', () => {
    const raw = JSON.stringify({ supply_level: 'High', region: 'North' });
    expect(customFieldValue(raw, 'supply_level')).toBe('High');
    expect(customFieldValue(raw, 'region')).toBe('North');
  });

  it('blank when the name has no value for the key', () => {
    expect(customFieldValue(JSON.stringify({}), 'supply_level')).toBe('');
    expect(customFieldValue(null, 'supply_level')).toBe('');
  });

  it('the visible columns are exactly the configured (non-hidden) fields', () => {
    const defs = [def(), def({ id: 'cf2', key: 'x', displayMode: 'HIDDEN' })];
    expect(visibleCustomFields(defs).map(d => d.key)).toEqual(['supply_level']);
    // None configured ⇒ no columns.
    expect(visibleCustomFields([])).toEqual([]);
    expect(visibleCustomFields(undefined)).toEqual([]);
  });

  it('tolerates the JSON scalar arriving as an object (codegen types it string)', () => {
    const asObject = { supply_level: 'Low' } as unknown as string;
    expect(parseCustomFields(asObject)).toEqual({ supply_level: 'Low' });
  });
});

describe('AC-N24 Custom Fields tab reflects configuration', () => {
  it('shows the configured fields, and an empty set when none are configured', () => {
    // The tab renders one read-only row per visible field; none configured ⇒ the
    // tab's empty state (visibleCustomFields drives both).
    const defs = [def(), def({ id: 'cf2', key: 'region', name: 'Region' })];
    expect(visibleCustomFields(defs).map(d => d.name)).toEqual([
      'Supply level',
      'Region',
    ]);
    expect(visibleCustomFields([])).toEqual([]);
  });

  it('reads each configured field value for the tab from the name JSON', () => {
    const raw = JSON.stringify({ supply_level: 'High' });
    expect(customFieldValue(raw, 'supply_level')).toBe('High');
    expect(customFieldValue(raw, 'region')).toBe('');
  });

  it('renders each field by its value type (boolean → checkbox, text → text)', () => {
    const raw = JSON.stringify({ supply_level: 'High', on_hold: true });
    expect(customFieldDisplay(def(), raw)).toEqual({
      kind: 'text',
      text: 'High',
    });
    expect(
      customFieldDisplay(def({ key: 'on_hold', valueType: 'BOOLEAN' }), raw)
    ).toEqual({ kind: 'boolean', checked: true });
    // Unset boolean reads as unchecked.
    expect(
      customFieldDisplay(def({ key: 'missing', valueType: 'BOOLEAN' }), raw)
    ).toEqual({ kind: 'boolean', checked: false });
  });

  it('resolves an OPTION value (option id) to the option name', () => {
    const optionDef = def({
      key: 'zone',
      valueType: 'OPTION',
      options: [
        { id: 'opt-a', key: 'a', name: 'Zone A' },
        { id: 'opt-b', key: 'b', name: 'Zone B' },
      ],
    });
    const raw = JSON.stringify({ zone: 'opt-b' });
    expect(customFieldDisplay(optionDef, raw)).toEqual({
      kind: 'option',
      id: 'opt-b',
      name: 'Zone B',
    });
    // Unset ⇒ blank id + name (the tab renders an empty disabled dropdown).
    expect(customFieldDisplay(optionDef, JSON.stringify({}))).toEqual({
      kind: 'option',
      id: '',
      name: '',
    });
    // Unknown id ⇒ falls back to the raw id as the name.
    expect(
      customFieldDisplay(optionDef, JSON.stringify({ zone: 'opt-x' }))
    ).toEqual({ kind: 'option', id: 'opt-x', name: 'opt-x' });
  });
});

describe('AC-N19 Custom-field filtering', () => {
  it('builds an ANDed dynamicFilter AST of text-like conditions', () => {
    expect(
      buildDynamicFilter({ supply_level: 'High', region: 'North' })
    ).toEqual({
      And: [
        {
          CustomField: {
            key: 'supply_level',
            filter: { Text: { Like: 'High' } },
          },
        },
        { CustomField: { key: 'region', filter: { Text: { Like: 'North' } } } },
      ],
    });
  });

  it('is a no-op (undefined) when nothing active — empty, blank, or null chips', () => {
    expect(buildDynamicFilter(undefined)).toBeUndefined();
    expect(buildDynamicFilter({})).toBeUndefined();
    expect(buildDynamicFilter({ supply_level: '' })).toBeUndefined();
    expect(buildDynamicFilter({ supply_level: '   ' })).toBeUndefined();
    expect(buildDynamicFilter({ supply_level: null })).toBeUndefined();
  });

  it('drops empty keys but keeps active ones', () => {
    expect(buildDynamicFilter({ a: '', b: 'x' })).toEqual({
      And: [{ CustomField: { key: 'b', filter: { Text: { Like: 'x' } } } }],
    });
  });
});
