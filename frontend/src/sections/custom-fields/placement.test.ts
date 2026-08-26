import { describe, expect, it } from 'vitest';
import {
  CustomFieldScopeConfig,
  UpdateCustomFieldScopes,
} from './customFieldConfig.generated';
import {
  applyChoice,
  configRows,
  currentMode,
  hasPendingChanges,
  offersPromotion,
  pendingUpdates,
  prominentChecked,
  savedMode,
  valueTypeLabelKey,
  visibleChecked,
  withProminent,
  withVisible,
  type ConfigRow,
  type DisplayMode,
  type PendingChanges,
} from './placement';
import {
  CUSTOM_FIELD_SCOPES,
  DEFAULT_SCOPE,
  scopeOffersProminent,
} from './scopes';

// Behaviour anchors: spec/custom-fields/cases/OMS-REG-CF-02.
// Rules: spec/custom-fields/rules.md · wire: contract.md · screens:
// ui-surface.md.

const row = (
  id: string,
  displayMode: DisplayMode | null,
  valueType: ConfigRow['valueType'] = 'TEXT'
): ConfigRow => ({ id, key: id, name: `Field ${id}`, valueType, displayMode });

describe('scope tabs and their controls (OMS-REG-CF-02.2)', () => {
  it('offers exactly the nine scopes, in the fixed order, first selected', () => {
    expect(CUSTOM_FIELD_SCOPES.map(s => s.value)).toEqual([
      'item',
      'customer',
      'supplier',
      'patient',
      'inbound_shipment',
      'outbound_shipment',
      'prescription',
      'supplier_return',
      'customer_return',
    ]);
    expect(DEFAULT_SCOPE).toBe('item');
  });

  it('shows Prominent only on the five invoice scopes', () => {
    // Items / Customers / Suppliers / Patients have no primary surface to
    // promote onto, so they offer Visible only.
    expect(
      ['item', 'customer', 'supplier', 'patient'].map(scopeOffersProminent)
    ).toEqual([false, false, false, false]);
    expect(
      [
        'inbound_shipment',
        'outbound_shipment',
        'prescription',
        'supplier_return',
        'customer_return',
      ].map(scopeOffersProminent)
    ).toEqual([true, true, true, true, true]);
  });

  it('offers no promotion for a scope string it does not know', () => {
    // `scope` is a free-form String on the wire, so an unknown value must never
    // be treated as a configurable scope with a primary surface.
    expect(scopeOffersProminent('ITEM')).toBe(false);
    expect(scopeOffersProminent('')).toBe(false);
  });

  it('names every tab with its own locale key', () => {
    const keys = CUSTOM_FIELD_SCOPES.map(s => s.labelKey);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys[0]).toBe('label.custom-field-scope-item');
    expect(keys[8]).toBe('label.custom-field-scope-customer-return');
  });
});

describe('every placed field is listed, hidden ones included (OMS-REG-CF-02.3)', () => {
  it('reads the configuration query, the only read that keeps HIDDEN', () => {
    // The display read (`customFields`, src/domain/customFields) filters hidden
    // placements out; this screen must use the admin/config read instead.
    expect(CustomFieldScopeConfig.query).toContain('customFieldScopeConfig');
    expect(CustomFieldScopeConfig.query).toContain('centralServer');
  });

  it('lists an out-of-sight field alongside a shown one, unfiltered', () => {
    const nodes = [
      row('a', 'VISIBLE'),
      row('b', 'HIDDEN'),
      row('c', 'PROMINENT'),
    ];
    expect(configRows(nodes).map(r => r.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('rows in configured order, with no list controls (OMS-REG-CF-02.8)', () => {
  it('preserves response order and never re-ranks', () => {
    // The per-scope rank reaches the client as response order only — there is
    // no order field to sort by.
    const nodes = [
      row('z', 'VISIBLE'),
      row('a', 'VISIBLE'),
      row('m', 'HIDDEN'),
    ];
    expect(configRows(nodes).map(r => r.id)).toEqual(['z', 'a', 'm']);
  });

  it('asks the wire for nothing but the scope — no sort, no pagination', () => {
    const query = CustomFieldScopeConfig.query;
    expect(query).toContain('$scope: String!');
    expect(query).not.toContain('sort');
    expect(query).not.toContain('page');
    expect(query).not.toContain('offset');
    expect(query).not.toContain('first');
  });
});

describe('a row shows its value type as a read-only label (OMS-REG-CF-02.9)', () => {
  it('labels the whole fixed value-type set, Real reading as Number', () => {
    expect(valueTypeLabelKey('TEXT')).toBe('label.custom-field-type-text');
    expect(valueTypeLabelKey('INTEGER')).toBe(
      'label.custom-field-type-integer'
    );
    // The one label that does not echo its type's name.
    expect(valueTypeLabelKey('REAL')).toBe('label.custom-field-type-real');
    expect(valueTypeLabelKey('DATE')).toBe('label.custom-field-type-date');
    expect(valueTypeLabelKey('BOOLEAN')).toBe(
      'label.custom-field-type-boolean'
    );
    expect(valueTypeLabelKey('OPTION')).toBe('label.custom-field-type-option');
  });

  it('falls back to Text for a value type this build cannot type', () => {
    // Unreachable while the generated union is exhaustive; reachable the day a
    // newer central introduces a type. It must not render blank.
    expect(valueTypeLabelKey('SOMETHING_NEWER' as ConfigRow['valueType'])).toBe(
      'label.custom-field-type-text'
    );
  });
});

describe('Save is enabled only while a change is pending (OMS-REG-CF-02.6)', () => {
  it('has nothing to save on arrival', () => {
    expect(hasPendingChanges({})).toBe(false);
  });

  it('has something to save once a placement changes', () => {
    const field = row('a', 'VISIBLE');
    const pending = applyChoice({}, field, 'HIDDEN');
    expect(hasPendingChanges(pending)).toBe(true);
    expect(currentMode(field, pending)).toBe('HIDDEN');
  });

  it('drops a round trip back to the saved value', () => {
    const field = row('a', 'VISIBLE');
    const hidden = applyChoice({}, field, 'HIDDEN');
    const back = applyChoice(hidden, field, 'VISIBLE');
    expect(hasPendingChanges(back)).toBe(false);
    expect(currentMode(field, back)).toBe('VISIBLE');
  });

  it('sends nothing for a mode that already holds', () => {
    const field = row('a', 'PROMINENT');
    const pending = applyChoice({}, field, 'PROMINENT');
    expect(pendingUpdates([field], pending)).toEqual([]);
  });
});

describe('a save carries only this scope’s changed placements (OMS-REG-CF-02.10)', () => {
  it('submits the changed rows only, in listed order', () => {
    const rows = [row('a', 'VISIBLE'), row('b', 'VISIBLE'), row('c', 'HIDDEN')];
    let pending: PendingChanges = applyChoice({}, rows[2], 'VISIBLE');
    pending = applyChoice(pending, rows[0], 'HIDDEN');
    expect(pendingUpdates(rows, pending)).toEqual([
      { customFieldId: 'a', displayMode: 'HIDDEN' },
      { customFieldId: 'c', displayMode: 'VISIBLE' },
    ]);
  });

  it('never carries a placement that is not on the listed scope', () => {
    // The pending set is dropped whenever the scope changes, but even a stale
    // entry cannot ride along: the update list is built from the listed rows.
    const rows = [row('a', 'VISIBLE')];
    const pending: PendingChanges = {
      a: 'HIDDEN',
      'other-scope-field': 'HIDDEN',
    };
    expect(pendingUpdates(rows, pending)).toEqual([
      { customFieldId: 'a', displayMode: 'HIDDEN' },
    ]);
  });

  it('names one scope per save on the wire', () => {
    expect(UpdateCustomFieldScopes.query).toContain(
      '$input: UpdateCustomFieldScopesInput!'
    );
    expect(UpdateCustomFieldScopes.query).toContain('updateScopes');
  });
});

describe('the display mode is one ordered axis (OMS-REG-CF-02.17)', () => {
  it('ticks Visible for any shown field, promoted or not', () => {
    expect(visibleChecked('VISIBLE')).toBe(true);
    expect(visibleChecked('PROMINENT')).toBe(true);
    expect(visibleChecked('HIDDEN')).toBe(false);
    // A mode a newer central configured reads as shown, like the server's own
    // read paths treat it.
    expect(visibleChecked('OTHER')).toBe(true);
  });

  it('ticks Prominent only for a promoted field', () => {
    expect(prominentChecked('PROMINENT')).toBe(true);
    expect(prominentChecked('VISIBLE')).toBe(false);
    expect(prominentChecked('HIDDEN')).toBe(false);
  });

  it('empties the Prominent cell while the field is out of sight', () => {
    // Nothing to promote, so no control at all — not an unticked box.
    expect(offersPromotion('HIDDEN')).toBe(false);
    expect(offersPromotion('VISIBLE')).toBe(true);
    expect(offersPromotion('PROMINENT')).toBe(true);
  });

  it('takes a promoted field out of sight, never both at once', () => {
    expect(withVisible('PROMINENT', false)).toBe('HIDDEN');
    expect(withVisible('VISIBLE', false)).toBe('HIDDEN');
  });

  it('returns a re-shown field as plain Visible, forgetting the promotion', () => {
    // The promotion is not remembered: hidden → shown is VISIBLE, never
    // PROMINENT (screen-confirmed; captured as-is pending a product decision).
    const field = row('a', 'PROMINENT');
    const hidden = applyChoice({}, field, withVisible('PROMINENT', false));
    const shownAgain = applyChoice(
      hidden,
      field,
      withVisible(currentMode(field, hidden), true)
    );
    expect(currentMode(field, shownAgain)).toBe('VISIBLE');
    // The saved value was the promoted one, so the round trip stays pending.
    expect(hasPendingChanges(shownAgain)).toBe(true);
    expect(pendingUpdates([field], shownAgain)).toEqual([
      { customFieldId: 'a', displayMode: 'VISIBLE' },
    ]);
  });

  it('promotes and demotes a shown field without touching visibility', () => {
    expect(withProminent(true)).toBe('PROMINENT');
    expect(withProminent(false)).toBe('VISIBLE');
  });
});

describe('an unrecognised mode is never written back as itself (contract wire trap)', () => {
  it('resolves a saved OTHER to plain Visible when its placement is saved', () => {
    // OTHER is accepted on input and SILENTLY coerced to VISIBLE, so it must
    // never be sent. Choosing "shown" on such a row therefore stays pending and
    // saves as VISIBLE.
    const field = row('a', 'OTHER');
    expect(savedMode(field)).toBe('OTHER');
    const hidden = applyChoice({}, field, withVisible('OTHER', false));
    const shownAgain = applyChoice(
      hidden,
      field,
      withVisible(currentMode(field, hidden), true)
    );
    expect(pendingUpdates([field], shownAgain)).toEqual([
      { customFieldId: 'a', displayMode: 'VISIBLE' },
    ]);
  });

  it('treats an absent mode as shown', () => {
    // displayMode is nullable only because it is populated for a single-scope
    // read; the configuration read always names one, so null is unreachable.
    expect(savedMode(row('a', null))).toBe('VISIBLE');
  });
});
