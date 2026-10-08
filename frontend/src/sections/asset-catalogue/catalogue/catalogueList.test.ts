import { describe, expect, it } from 'vitest';
import { typesFor } from './catalogueFilters';
import { catalogueToCsv, type CatalogueRow } from './catalogueToCsv';

// Anchors: spec/asset-catalogue/cases — OMS-REG-CAT-01.25 / .26 (the type
// filter's options) and OMS-REG-CAT-02.3 (the export's columns). The filtering itself is
// the server's; the e2e suite drives it.

const types = [
  { id: 'room', name: 'Cold room', categoryId: 'rooms' },
  { id: 'freezer-room', name: 'Freezer room', categoryId: 'rooms' },
  { id: 'fridge', name: 'Refrigerator', categoryId: 'fridges' },
];

describe('OMS-REG-CAT-01.25 / .26 — the type filter follows the chosen category', () => {
  it('a chosen category offers only its types', () => {
    expect(typesFor(types, 'rooms').map(t => t.name)).toEqual([
      'Cold room',
      'Freezer room',
    ]);
  });
  it('no category offers every type', () => {
    expect(typesFor(types, undefined)).toHaveLength(3);
  });
});

describe("OMS-REG-CAT-02.3 — the export carries the list's seven columns in order", () => {
  it('headings and one line per item', () => {
    const row: CatalogueRow = {
      id: '1',
      subCatalogue: 'WHO PQS',
      code: 'E003/002',
      manufacturer: null,
      model: 'HBD 116',
      assetClassId: 'c',
      assetCategoryId: 'g',
      assetTypeId: 't',
      assetClass: { name: 'Cold chain equipment' },
      assetCategory: { name: 'Refrigerators and freezers' },
      assetType: { name: 'Freezer' },
    };
    expect(catalogueToCsv([row]).split('\r\n')).toEqual([
      'label.sub-catalogue,label.code,label.type,label.manufacturer,label.model,label.class,label.category',
      'WHO PQS,E003/002,Freezer,,HBD 116,Cold chain equipment,Refrigerators and freezers',
    ]);
  });
});
