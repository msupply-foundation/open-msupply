import { describe, it, expect } from 'vitest';
import { buildPatch, invalidLocation, seedEdit } from './stockEdit';
import type { StockLineDetailFragment } from './stockLine.generated';

// The edit buffer and the patch it commits — the save contract, pinned pure.
// The server-side outcomes (the fields actually persisting, the barcode GTIN
// association, the typed rejections) are exercised against the real backend in
// the e2e/ suites (conformance C2); these pin what the client sends.
//
// Anchors: spec/stock/cases/OMS-REG-INV-02.
//   .38 — a line whose location violates the item's restriction warns
//   .39 — a saved edit changes exactly the edited fields
//   .40 — clearing an optional field leaves it empty
//   .45 — saving a barcode links the GTIN at the line's pack size
//   .46 — saving an emptied barcode unlinks it

const line = (
  over: Partial<StockLineDetailFragment> = {}
): StockLineDetailFragment =>
  ({
    id: 'sl1',
    itemId: 'item1',
    itemName: 'Amoxicillin',
    storeId: 'store1',
    batch: 'B1',
    packSize: 10,
    costPricePerPack: 2,
    sellPricePerPack: 3,
    availableNumberOfPacks: 5,
    totalNumberOfPacks: 5,
    expiryDate: '2027-01-01',
    manufactureDate: null,
    onHold: false,
    note: null,
    barcode: null,
    volumePerPack: 0.5,
    totalVolume: 2.5,
    supplierName: null,
    locationId: null,
    vvmStatusId: null,
    itemVariantId: null,
    location: null,
    vvmStatus: null,
    itemVariant: null,
    donor: null,
    manufacturer: null,
    campaign: null,
    program: null,
    item: {
      id: 'item1',
      code: 'AMX',
      name: 'Amoxicillin',
      unitName: 'tablet',
      isVaccine: false,
      doses: 0,
      restrictedLocationTypeId: null,
      restrictedLocationType: null,
    },
    ...over,
  }) as StockLineDetailFragment;

describe('OMS-REG-INV-02.39 — a patch carries exactly the edited fields', () => {
  it('sends only the id when nothing was touched', () => {
    const l = line();
    expect(buildPatch(seedEdit(l), l)).toEqual({ id: 'sl1' });
  });

  it('sends one field when one field changed', () => {
    const l = line();
    const edit = { ...seedEdit(l), costPricePerPack: 9 };
    expect(buildPatch(edit, l)).toEqual({ id: 'sl1', costPricePerPack: 9 });
  });

  it('leaves an untouched field out even when it holds a falsy value', () => {
    // volumePerPack 0 and onHold false must not look like "changed".
    const l = line({ volumePerPack: 0, onHold: false });
    const patch = buildPatch({ ...seedEdit(l), batch: 'B2' }, l);
    expect(patch).toEqual({ id: 'sl1', batch: 'B2' });
  });

  it('re-seeding from a saved line yields an empty patch again', () => {
    const saved = line({ batch: 'B2', costPricePerPack: 9 });
    expect(buildPatch(seedEdit(saved), saved)).toEqual({ id: 'sl1' });
  });
});

describe('OMS-REG-INV-02.40 — clearing an optional field', () => {
  it('clears expiry through the nullable wrapper', () => {
    const l = line({ expiryDate: '2027-01-01' });
    const patch = buildPatch({ ...seedEdit(l), expiryDate: null }, l);
    expect(patch.expiryDate).toEqual({ value: null });
  });

  it('clears a location through the nullable wrapper', () => {
    const l = line({
      location: { id: 'loc1', code: 'A', name: 'Shelf A', locationType: null },
    });
    const patch = buildPatch({ ...seedEdit(l), location: null }, l);
    expect(patch.location).toEqual({ value: null });
  });

  it('clears a donor through the nullable wrapper', () => {
    const l = line({ donor: { id: 'd1', name: 'Donor' } });
    const patch = buildPatch({ ...seedEdit(l), donorId: null }, l);
    expect(patch.donorId).toEqual({ value: null });
  });

  it('distinguishes a cleared field from an untouched one', () => {
    // An untouched null optional field must not be sent at all — sending
    // { value: null } for it would be indistinguishable from a clear.
    const l = line({ expiryDate: null, manufactureDate: null });
    expect(buildPatch(seedEdit(l), l)).toEqual({ id: 'sl1' });
  });
});

describe('OMS-REG-INV-02.17/.18 — the on-hold toggle', () => {
  it('.17 sends onHold true when the line is put on hold', () => {
    const l = line({ onHold: false });
    expect(buildPatch({ ...seedEdit(l), onHold: true }, l).onHold).toBe(true);
  });

  it('.18 sends onHold false when the hold is released', () => {
    const l = line({ onHold: true });
    expect(buildPatch({ ...seedEdit(l), onHold: false }, l).onHold).toBe(false);
  });

  it('omits onHold entirely when the toggle was not touched', () => {
    // A false that means "unchanged" must not be sent — otherwise every save
    // rewrites the hold flag.
    expect(
      buildPatch(seedEdit(line({ onHold: true })), line({ onHold: true }))
    ).not.toHaveProperty('onHold');
  });
});

describe('OMS-REG-INV-02.45/.46 — barcode is a plain scalar', () => {
  it('.45 sends the typed barcode value to link it', () => {
    const l = line({ barcode: null });
    const patch = buildPatch({ ...seedEdit(l), barcode: '05012345678900' }, l);
    expect(patch.barcode).toBe('05012345678900');
  });

  it('.46 sends an empty string to unlink, not a null wrapper', () => {
    const l = line({ barcode: '05012345678900' });
    const patch = buildPatch({ ...seedEdit(l), barcode: '' }, l);
    expect(patch.barcode).toBe('');
  });

  it('omits the barcode entirely when the field was not touched', () => {
    const l = line({ barcode: '05012345678900' });
    expect(buildPatch(seedEdit(l), l)).not.toHaveProperty('barcode');
  });
});

describe('changing the manufacturer clears the item variant', () => {
  // spec/stock ui-surface S2 (Supply chain): "changing it clears the item
  // variant". No behaviour asserts this — carried as a gap probe in
  // exploratory/workflows/stock.md.
  it('sends both the new manufacturer and a null item variant', () => {
    const l = line({
      manufacturer: { id: 'm1', name: 'Acme' },
      itemVariantId: 'v1',
    });
    const edit = { ...seedEdit(l), manufacturer: { id: 'm2', name: 'Beta' } };
    const patch = buildPatch(edit, l);
    expect(patch.manufacturerId).toEqual({ value: 'm2' });
    expect(patch.itemVariantId).toEqual({ value: null });
  });

  it('leaves the item variant alone when the manufacturer is untouched', () => {
    const l = line({ manufacturer: { id: 'm1', name: 'Acme' } });
    const patch = buildPatch({ ...seedEdit(l), batch: 'B2' }, l);
    expect(patch).not.toHaveProperty('itemVariantId');
  });
});

describe('campaign and program are one mutually-exclusive choice', () => {
  // Both wrappers always travel together so choosing one side clears the
  // other. No behaviour asserts this — carried as a gap probe in
  // exploratory/workflows/stock.md.
  it('choosing a program clears the campaign in the same patch', () => {
    const l = line({ campaign: { id: 'c1', name: 'Campaign' } });
    const edit = { ...seedEdit(l), campaignId: null, programId: 'p1' };
    const patch = buildPatch(edit, l);
    expect(patch.campaignId).toEqual({ value: null });
    expect(patch.programId).toEqual({ value: 'p1' });
  });

  it('sends neither wrapper when neither side changed', () => {
    const l = line({ program: { id: 'p1', name: 'Program' } });
    const patch = buildPatch(seedEdit(l), l);
    expect(patch).not.toHaveProperty('campaignId');
    expect(patch).not.toHaveProperty('programId');
  });
});

describe('OMS-REG-INV-02.38 — invalid-location warning', () => {
  const typed = (typeId: string | null) => ({
    id: 'loc1',
    code: 'A',
    name: 'Shelf A',
    locationType: typeId ? { id: typeId, name: 'Cold' } : null,
  });

  it('warns when the line sits in a location of the wrong type', () => {
    expect(
      invalidLocation(
        line({
          location: typed('ambient'),
          item: { ...line().item, restrictedLocationTypeId: 'cold' },
        })
      )
    ).toBe(true);
  });

  it('warns when the line sits in an untyped location under a restriction', () => {
    expect(
      invalidLocation(
        line({
          location: typed(null),
          item: { ...line().item, restrictedLocationTypeId: 'cold' },
        })
      )
    ).toBe(true);
  });

  it('is quiet when the location type matches the restriction', () => {
    expect(
      invalidLocation(
        line({
          location: typed('cold'),
          item: { ...line().item, restrictedLocationTypeId: 'cold' },
        })
      )
    ).toBe(false);
  });

  it('is quiet for an unrestricted item, whatever the location', () => {
    expect(invalidLocation(line({ location: typed('ambient') }))).toBe(false);
  });

  it('is quiet when the line has no location at all', () => {
    expect(
      invalidLocation(
        line({ item: { ...line().item, restrictedLocationTypeId: 'cold' } })
      )
    ).toBe(false);
  });
});
