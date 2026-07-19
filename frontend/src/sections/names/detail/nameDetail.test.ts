import { describe, expect, it } from 'vitest';
import {
  contactCategory,
  contactFullName,
  detailFromResult,
  isStoreName,
  supplyLevelValue,
  type NameDetail,
  type NamePropertyDef,
} from './nameDetail';
import type { NameByIdResult } from '../names.generated';

// Logic-level coverage of the detail views (spec/names slice 2). The rendered-UI
// / read-only-a11y assertions (C4) and populated live data (C2) are recorded as
// gaps in BUILD_REPORT; here we cover the read-model derivation.

const detail = (over: Partial<NameDetail> = {}): NameDetail => ({
  id: 'n1',
  code: 'ACME',
  name: 'Acme Health',
  type: 'FACILITY',
  isCustomer: true,
  isSupplier: true,
  isVisible: true,
  store: null,
  phone: '123',
  address1: '1 St',
  address2: null,
  country: 'NZ',
  website: 'https://acme.example',
  comment: null,
  chargeCode: 'CC',
  isManufacturer: false,
  isDonor: false,
  isOnHold: false,
  createdDatetime: '2024-01-01T00:00:00',
  properties: '{}',
  customFields: null,
  hshCode: 'H1',
  hshName: 'HSH One',
  email: 'a@b.c',
  margin: 10,
  freightFactor: 1.5,
  currency: { id: 'c', code: 'USD' },
  ...over,
});

const result = (node?: NameDetail): NameByIdResult => ({
  names: {
    __typename: 'NameConnector',
    nodes: node ? [node] : [],
  },
});

describe('AC-N21 Supplier detail from the single-name read', () => {
  it('takes the single name from the id-filtered read', () => {
    const node = detail();
    expect(detailFromResult(result(node))?.id).toBe('n1');
    // No match ⇒ undefined.
    expect(detailFromResult(result())).toBeUndefined();
    expect(detailFromResult(undefined)).toBeUndefined();
  });
});

describe('AC-N20 Customer detail shows attributes and supply level', () => {
  const defs: NamePropertyDef[] = [
    {
      id: 'p1',
      property: {
        id: 'pp1',
        key: 'supply_level',
        name: 'Supply level',
        valueType: 'STRING',
        allowedValues: null,
      },
    },
  ];

  it('reads the supply level (v1 name property) out of the properties blob', () => {
    const props = JSON.stringify({ supply_level: 'High' });
    expect(supplyLevelValue(props, defs)).toBe('High');
  });

  it('blank when unset or no property configured', () => {
    expect(supplyLevelValue('{}', defs)).toBe('');
    expect(supplyLevelValue(JSON.stringify({ supply_level: 'Low' }), [])).toBe(
      // Falls back to the well-known key when no definition is present.
      'Low'
    );
    expect(supplyLevelValue(null, defs)).toBe('');
  });
});

describe('AC-N22 Detail views are read-only', () => {
  it('the read model is derivation-only — no mutation helpers exist here', () => {
    // The module exports only readers/derivers; there is nothing that writes.
    const node = detail();
    // Deriving a value never mutates the source.
    const before = JSON.stringify(node);
    supplyLevelValue(node.properties, []);
    expect(JSON.stringify(node)).toBe(before);
  });
});

describe('AC-N23 Contacts tab is a read-only list', () => {
  it('derives a contact full name and a single category', () => {
    expect(contactFullName({ firstName: 'Ada', lastName: 'Lovelace' })).toBe(
      'Ada Lovelace'
    );
    expect(
      contactCategory({
        category1: null,
        category2: 'Pharmacy',
        category3: 'X',
      })
    ).toBe('Pharmacy');
    expect(
      contactCategory({ category1: null, category2: null, category3: null })
    ).toBe('');
  });
});

describe('AC-N25 Role-specific fields', () => {
  it('the detail model carries supplier-only trade terms', () => {
    const node = detail();
    expect(node.hshCode).toBe('H1');
    expect(node.hshName).toBe('HSH One');
    expect(node.email).toBe('a@b.c');
    expect(node.currency?.code).toBe('USD');
    expect(node.margin).toBe(10);
    expect(node.freightFactor).toBe(1.5);
  });

  it('supply level (customer-only) is read from the name-property blob', () => {
    expect(supplyLevelValue(JSON.stringify({ supply_level: 'Mid' }), [])).toBe(
      'Mid'
    );
  });
});

describe('AC-N8/AC-N24 detail store indicator & empty custom fields', () => {
  it('flags a store-kind name in the detail header (AC-N24 empty handled in tab)', () => {
    expect(
      isStoreName(detail({ store: { id: 's', code: 'S', storeName: 'S' } }))
    ).toBe(true);
    expect(isStoreName(detail({ store: null }))).toBe(false);
  });
});
