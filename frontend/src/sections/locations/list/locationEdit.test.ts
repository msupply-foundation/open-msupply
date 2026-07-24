import { describe, expect, it } from 'vitest';
import {
  EMPTY_FORM,
  buildInsertInput,
  buildUpdateInput,
  formFromLocation,
  isFormValid,
  nextLocation,
  saveRejection,
  type LocationFormState,
  type LocationRow,
} from './locationEdit';

// AC-citing tests for the create/edit modal's logic (spec/locations/
// acceptance.md). The server-side halves of these criteria (persistence, the
// store-scoped uniqueness check, the wire name-defaults-to-code) run against
// the real backend, which has no CI harness yet — that gap is recorded in
// BUILD_REPORT.md; these tests pin the client's obligations.

const row = (overrides: Partial<LocationRow> = {}): LocationRow => ({
  id: 'loc-1',
  code: 'A1',
  name: 'Aisle A',
  onHold: false,
  volume: 10,
  volumeUsed: 2,
  stock: { __typename: 'StockLineConnector', totalCount: 1 },
  locationType: null,
  ...overrides,
});

const form = (
  overrides: Partial<LocationFormState> = {}
): LocationFormState => ({
  name: 'Aisle A',
  code: 'A1',
  locationTypeId: '',
  volume: undefined,
  onHold: false,
  ...overrides,
});

describe('OMS-REG-INV-01.1 — create with code and name', () => {
  it('builds the insert input with the given code and name and the defaults: on-hold off, volume 0, no type', () => {
    const input = buildInsertInput(form(), 'new-id');
    expect(input).toEqual({
      id: 'new-id',
      code: 'A1',
      name: 'Aisle A',
      onHold: false,
      volume: 0,
      locationTypeId: null,
    });
  });

  it('carries a picked type, a set volume, and a toggled on-hold', () => {
    const input = buildInsertInput(
      form({ locationTypeId: 'type-1', volume: 4.5, onHold: true }),
      'new-id'
    );
    expect(input.locationTypeId).toBe('type-1');
    expect(input.volume).toBe(4.5);
    expect(input.onHold).toBe(true);
  });

  it('the id is client-generated and passed in (rules.md § identity)', () => {
    expect(buildInsertInput(form(), 'abc').id).toBe('abc');
  });
});

describe('OMS-REG-INV-01.23 — name defaults to code (wire default)', () => {
  // The server stores code as the name when none is supplied ON THE WIRE; the
  // UI never exercises it because OMS-REG-INV-01.24 requires a name before any request is
  // sent. The client-side guarantee is therefore: every insert this client
  // builds carries a non-empty name. The wire default itself is a
  // real-backend criterion (BUILD_REPORT gap).
  it('the client always sends the entered name', () => {
    expect(buildInsertInput(form({ name: 'Fridge' }), 'id').name).toBe(
      'Fridge'
    );
  });
});

describe('OMS-REG-INV-01.24 — code and name required in the UI', () => {
  it('is invalid (save disabled, no request) while name or code is empty', () => {
    expect(isFormValid(form({ name: '' }))).toBe(false);
    expect(isFormValid(form({ code: '' }))).toBe(false);
    expect(isFormValid(form({ name: '', code: '' }))).toBe(false);
  });

  it('is invalid for whitespace-only values', () => {
    expect(isFormValid(form({ name: '   ' }))).toBe(false);
    expect(isFormValid(form({ code: '\t ' }))).toBe(false);
  });

  it('is valid once both are non-blank', () => {
    expect(isFormValid(form())).toBe(true);
  });

  it('a fresh create form starts invalid', () => {
    expect(isFormValid(EMPTY_FORM)).toBe(false);
  });
});

describe('OMS-REG-INV-01.25 / OMS-REG-INV-01.27 — duplicate code rejected', () => {
  it('maps UniqueValueViolation on code to the duplicate-code rejection', () => {
    expect(
      saveRejection({
        __typename: 'UniqueValueViolation',
        field: 'code',
        description: 'Unique value violation',
      })
    ).toEqual({ kind: 'duplicateCode' });
  });

  it('a UniqueValueViolation on another field is not the duplicate-code case', () => {
    expect(
      saveRejection({
        __typename: 'UniqueValueViolation',
        field: 'name',
        description: 'Unique value violation',
      })
    ).toEqual({ kind: 'other', description: 'Unique value violation' });
  });
});

describe('OMS-REG-INV-01.5 — save and advance', () => {
  const rows = [row({ id: 'a' }), row({ id: 'b' }), row({ id: 'c' })];

  it('edit: advances to the next list location', () => {
    expect(nextLocation(rows, 'a')?.id).toBe('b');
    expect(nextLocation(rows, 'b')?.id).toBe('c');
  });

  it('edit: no next on the last row (the affordance disables)', () => {
    expect(nextLocation(rows, 'c')).toBeUndefined();
  });

  it('an id not in the list has no next', () => {
    expect(nextLocation(rows, 'zz')).toBeUndefined();
  });
});

describe('OMS-REG-INV-01.26 — edit fields', () => {
  it('the update input carries exactly the edited field set for the location id', () => {
    const input = buildUpdateInput(
      form({ name: 'Renamed', code: 'B2', volume: 7, onHold: true }),
      'loc-1'
    );
    expect(input).toEqual({
      id: 'loc-1',
      code: 'B2',
      name: 'Renamed',
      onHold: true,
      volume: 7,
      locationTypeId: null,
    });
  });

  it('the edit form seeds from the clicked row', () => {
    const seeded = formFromLocation(
      row({
        code: 'F1',
        name: 'Freezer',
        onHold: true,
        volume: 3,
        locationType: {
          id: 'type-9',
          name: 'Freezer',
          minTemperature: -30,
          maxTemperature: -15,
        },
      })
    );
    expect(seeded).toEqual({
      name: 'Freezer',
      code: 'F1',
      locationTypeId: 'type-9',
      volume: 3,
      onHold: true,
    });
  });
});

describe("OMS-REG-INV-01.28 — cannot edit another store's location", () => {
  it('maps RecordBelongsToAnotherStore to the generic rejection with its description (inline banner, nothing changes)', () => {
    expect(
      saveRejection({
        __typename: 'RecordBelongsToAnotherStore',
        description: 'Record belongs to another store',
      })
    ).toEqual({
      kind: 'other',
      description: 'Record belongs to another store',
    });
  });
});

describe('OMS-REG-INV-01.29 — location type survives an unrelated field edit', () => {
  // updateLocation's locationTypeId is NOT partial (contract.md ⚠️ wire trap):
  // omitting it clears the type. The client therefore sends the FULL current
  // field set — including the unchanged locationTypeId — on every save.
  it('an on-hold toggle still re-sends the current locationTypeId', () => {
    const seeded = formFromLocation(
      row({
        locationType: {
          id: 'type-9',
          name: 'Freezer',
          minTemperature: -30,
          maxTemperature: -15,
        },
      })
    );
    const toggled = { ...seeded, onHold: true };
    const input = buildUpdateInput(toggled, 'loc-1');
    expect(input.locationTypeId).toBe('type-9');
    // And the full field set is present — no sparse patch.
    expect(Object.keys(input).sort()).toEqual([
      'code',
      'id',
      'locationTypeId',
      'name',
      'onHold',
      'volume',
    ]);
  });
});

describe('OMS-REG-INV-01.30 — volume used is read-only and derived', () => {
  it('no input carries volumeUsed — neither insert nor update', () => {
    expect(buildInsertInput(form(), 'id')).not.toHaveProperty('volumeUsed');
    expect(buildUpdateInput(form(), 'id')).not.toHaveProperty('volumeUsed');
    // Nor does the form state hold one to send.
    expect(EMPTY_FORM).not.toHaveProperty('volumeUsed');
  });
});
