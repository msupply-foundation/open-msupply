import { describe, expect, it } from 'vitest';
import { CCE_CLASS_ID } from '../equipment';
import {
  buildCreatedLogInput,
  buildInsertInput,
  canCreate,
  emptyCreateForm,
  isTypeChoosable,
  withCatalogueMode,
  withCategory,
  type CreateAssetForm,
} from './createAsset';

const form = (over: Partial<CreateAssetForm> = {}): CreateAssetForm => ({
  ...emptyCreateForm(),
  ...over,
});

describe('the catalogue path is the default', () => {
  it('opens with the catalogue in use', () => {
    expect(emptyCreateForm().useCatalogue).toBe(true);
  });
});

describe('OMS-REG-CCE-05.5 — toggling the switch clears the choice beneath it', () => {
  it('drops a catalogue item when the catalogue is turned off', () => {
    const chosen = form({ catalogueItemId: 'cat-1' });
    expect(withCatalogueMode(chosen, false).catalogueItemId).toBe('');
  });

  it('drops a type when the catalogue is turned back on', () => {
    const chosen = form({ useCatalogue: false, typeId: 'type-1' });
    expect(withCatalogueMode(chosen, true).typeId).toBe('');
  });

  it('keeps the asset number and notes across the toggle', () => {
    const chosen = form({ assetNumber: 'CCE-1', notes: 'a note' });
    const next = withCatalogueMode(chosen, false);
    expect(next.assetNumber).toBe('CCE-1');
    expect(next.notes).toBe('a note');
  });
});

describe('OMS-REG-CCE-05.4 — the type picker needs a category first', () => {
  it('is not choosable with no category', () => {
    expect(isTypeChoosable(form({ useCatalogue: false }))).toBe(false);
  });

  it('becomes choosable once a category is chosen', () => {
    expect(
      isTypeChoosable(form({ useCatalogue: false, categoryId: 'cat' }))
    ).toBe(true);
  });

  it('clears a type when the category changes under it', () => {
    const chosen = form({ categoryId: 'a', typeId: 'type-1' });
    expect(withCategory(chosen, 'b').typeId).toBe('');
  });

  it('clears a catalogue item when the category changes — the picker narrows by it', () => {
    const chosen = form({ categoryId: 'a', catalogueItemId: 'item-1' });
    expect(withCategory(chosen, 'b').catalogueItemId).toBe('');
  });
});

describe('OMS-REG-CCE-05.13 / .8 — the confirm follows the draft', () => {
  it('is unavailable with no asset number', () => {
    expect(canCreate(form({ catalogueItemId: 'item-1' }))).toBe(false);
    expect(
      canCreate(form({ catalogueItemId: 'item-1', assetNumber: '   ' }))
    ).toBe(false);
  });

  it('is unavailable with no catalogue item, on the catalogue path', () => {
    expect(canCreate(form({ assetNumber: 'CCE-1' }))).toBe(false);
  });

  it('is unavailable with no type, off the catalogue path', () => {
    expect(
      canCreate(form({ useCatalogue: false, assetNumber: 'CCE-1' }))
    ).toBe(false);
  });

  it('becomes available once both are answered — catalogue path', () => {
    expect(
      canCreate(form({ assetNumber: 'CCE-1', catalogueItemId: 'item-1' }))
    ).toBe(true);
  });

  it('becomes available once both are answered — bare-type path', () => {
    expect(
      canCreate(
        form({ useCatalogue: false, assetNumber: 'CCE-1', typeId: 'type-1' })
      )
    ).toBe(true);
  });
});

describe('OMS-REG-CCE-05.1 / .3 / OMS-REG-CCE-05.8 the insert input', () => {
  it('always names the cold-chain class', () => {
    // An insert naming neither a catalogue item nor all three ids fails as a
    // foreign-key error, not a stated one (contract ⚠️ wire trap).
    const input = buildInsertInput(
      form({ assetNumber: 'CCE-1', catalogueItemId: 'item-1' }),
      'new-id'
    );
    expect(input.classId).toBe(CCE_CLASS_ID);
  });

  it('sends the catalogue item on the catalogue path, and no type', () => {
    const input = buildInsertInput(
      form({
        assetNumber: 'CCE-1',
        categoryId: 'cat-1',
        catalogueItemId: 'item-1',
      }),
      'new-id'
    );
    expect(input.catalogueItemId).toBe('item-1');
    expect(input).not.toHaveProperty('typeId');
  });

  it('sends the type off the catalogue path, and no catalogue item', () => {
    const input = buildInsertInput(
      form({
        useCatalogue: false,
        assetNumber: 'CCE-1',
        categoryId: 'cat-1',
        typeId: 'type-1',
      }),
      'new-id'
    );
    expect(input.typeId).toBe('type-1');
    expect(input).not.toHaveProperty('catalogueItemId');
  });

  it('trims the asset number and the notes', () => {
    const input = buildInsertInput(
      form({
        assetNumber: '  CCE-1  ',
        notes: '  a note  ',
        catalogueItemId: 'item-1',
      }),
      'new-id'
    );
    expect(input.assetNumber).toBe('CCE-1');
    expect(input.notes).toBe('a note');
  });

  it('sends null rather than an empty note', () => {
    const input = buildInsertInput(
      form({ assetNumber: 'CCE-1', catalogueItemId: 'item-1' }),
      'new-id'
    );
    expect(input.notes).toBeNull();
  });

  it('omits the store where the modal does not offer one', () => {
    // Absent, the resolver defaults it to the acting store, so an asset always
    // belongs to one.
    const input = buildInsertInput(
      form({ assetNumber: 'CCE-1', catalogueItemId: 'item-1' }),
      'new-id'
    );
    expect(input).not.toHaveProperty('storeId');
  });

  it('sends the store the central modal chose', () => {
    const input = buildInsertInput(
      form({
        assetNumber: 'CCE-1',
        catalogueItemId: 'item-1',
        storeId: 'store-b',
      }),
      'new-id'
    );
    expect(input.storeId).toBe('store-b');
  });
});

describe('OMS-REG-CCE-05.6 — a created asset opens its status history', () => {
  it('records a Functioning entry with the created comment', () => {
    const input = buildCreatedLogInput('asset-1', 'log-1', 'Asset created');
    expect(input).toMatchObject({
      id: 'log-1',
      assetId: 'asset-1',
      status: 'FUNCTIONING',
      comment: 'Asset created',
    });
  });

  it('records the imported row’s own status when one is given', () => {
    // The import writes the same opening entry, at the status the row named
    // (rules › where an asset comes from).
    const input = buildCreatedLogInput(
      'asset-1',
      'log-1',
      'Asset created',
      'NOT_IN_USE'
    );
    expect(input.status).toBe('NOT_IN_USE');
  });
});
