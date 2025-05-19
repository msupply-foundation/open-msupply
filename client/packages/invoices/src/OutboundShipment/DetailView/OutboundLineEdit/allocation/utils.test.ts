import { DraftStockOutLineFragment } from '../../../api/operations.generated';
import { AllocateIn } from './useAllocationContext';
import {
  getAllocatedQuantity,
  getDoseQuantity,
  issueDoses,
  issuePacks,
} from './utils';

describe('getDoseQuantity', () => {
  it('calculates allocated doses based on default doses per unit', () => {
    const line = {
      numberOfPacks: 5,
      packSize: 10,
      defaultDosesPerUnit: 2,
    } as DraftStockOutLineFragment;

    const result = getDoseQuantity(line);
    expect(result).toBe(100);
  });

  it('calculates allocated doses based on item variant doses per unit when set', () => {
    const line = {
      numberOfPacks: 5,
      packSize: 10,
      defaultDosesPerUnit: 2,
      itemVariant: {
        dosesPerUnit: 3,
      },
    } as DraftStockOutLineFragment;

    const result = getDoseQuantity(line);
    expect(result).toBe(150);
  });

  it('handles doses per unit of 0, treat as 1 dose per unit', () => {
    const line = {
      numberOfPacks: 5,
      packSize: 10,
      defaultDosesPerUnit: 0,
    } as DraftStockOutLineFragment;

    const result = getDoseQuantity(line);
    expect(result).toBe(50);
  });
});

describe('getAllocatedQuantity', () => {
  const draftLines = [
    { numberOfPacks: 2, packSize: 3, defaultDosesPerUnit: 2 },
    {
      numberOfPacks: 5,
      packSize: 10,
      defaultDosesPerUnit: 2,
      itemVariant: { dosesPerUnit: 3 },
    },
  ] as DraftStockOutLineFragment[];

  it('returns dose quantity when allocating in doses', () => {
    const result = getAllocatedQuantity({
      // line 1 uses default doses per unit, line 2 uses item variant doses per unit
      draftLines, // line1: 2*3*2=12, line2: 5*10*3=150 == 162
      allocateIn: AllocateIn.Doses,
    });
    expect(result).toBe(162);
  });

  it('returns unit quantity when allocating in units', () => {
    const result = getAllocatedQuantity({
      draftLines, // line1: 2*3=6, line2: 5*10=50 == 56
      allocateIn: AllocateIn.Units,
    });
    expect(result).toBe(56);
  });

  it('includes placeholder quantity when provided', () => {
    const result = getAllocatedQuantity({
      draftLines, // line1: 2*3=6, line2: 5*10=50 == 56
      allocateIn: AllocateIn.Units,
      placeholderQuantity: 100,
    });
    expect(result).toBe(156);
  });
});

describe('issuePacks', () => {
  it('updates the number of packs for the specified line', () => {
    const draftLines = [
      { id: '1', numberOfPacks: 2, packSize: 10 },
      { id: '2', numberOfPacks: 3, packSize: 5 },
    ] as DraftStockOutLineFragment[];

    const result = issuePacks(draftLines, '1', 5);
    expect(result).toEqual([
      { id: '1', numberOfPacks: 5, packSize: 10 },
      { id: '2', numberOfPacks: 3, packSize: 5 },
    ]);
  });

  it('returns the original draft lines if the specified line is not found', () => {
    const draftLines = [
      { id: '1', numberOfPacks: 2, packSize: 10 },
      { id: '2', numberOfPacks: 3, packSize: 5 },
    ] as DraftStockOutLineFragment[];

    const result = issuePacks(draftLines, '3', 5);
    expect(result).toEqual(draftLines);
  });
});

describe('issueDoses', () => {
  const line1 = {
    id: '1',
    numberOfPacks: 2,
    packSize: 10,
    defaultDosesPerUnit: 2,
  } as DraftStockOutLineFragment;

  it('returns the original draft lines if the specified line is not found', () => {
    const draftLines = [
      line1,
      { ...line1, id: '2', numberOfPacks: 3 },
    ] as DraftStockOutLineFragment[];

    const result = issueDoses(draftLines, '3', 5);
    expect(result).toEqual(draftLines);
  });

  it('updates the number of packs for the specified line, based on default units per dose and pack size', () => {
    const line2 = {
      id: '2',
      packSize: 5,
      defaultDosesPerUnit: 2,
    } as DraftStockOutLineFragment;

    const draftLines = [line1, line2];

    const result = issueDoses(draftLines, '2', 30);
    expect(result).toEqual([
      line1,
      { ...line2, numberOfPacks: 3 }, // 30 doses / (5 units per pack * 2 dose per unit) = 3 packs
    ]);
  });

  it('updates based on item variant units per dose', () => {
    const line2 = {
      id: '2',
      packSize: 5,
      defaultDosesPerUnit: 2,
      itemVariant: {
        dosesPerUnit: 3,
      },
    } as DraftStockOutLineFragment;

    const draftLines = [line1, line2];

    const result = issueDoses(draftLines, '2', 30);
    expect(result).toEqual([
      line1,
      { ...line2, numberOfPacks: 2 }, // 30 doses / (5 units per pack * 3 dose per unit) = 2 packs
    ]);
  });

  it('handles doses per unit of 0', () => {
    const line2 = {
      id: '2',
      packSize: 5,
      defaultDosesPerUnit: 0,
    } as DraftStockOutLineFragment;

    const draftLines = [line1, line2];

    const result = issueDoses(draftLines, '2', 30);
    expect(result).toEqual([
      line1,
      { ...line2, numberOfPacks: 6 }, // 30 doses / 5 units per pack / (none) = 6 packs
    ]);
  });

  it('rounds up to nearest pack size', () => {
    const line2 = {
      id: '2',
      packSize: 2,
      defaultDosesPerUnit: 5,
    } as DraftStockOutLineFragment;

    const draftLines = [line1, line2];

    const result = issueDoses(draftLines, '2', 18);
    expect(result).toEqual([
      line1,
      // 18 doses / 2 units per pack / 5 doses per unit = 1.8 ~= 2 packs
      { ...line2, numberOfPacks: 2 },
    ]);
  });

  it('skips rounding if partial packs allowed', () => {
    const line2 = {
      id: '2',
      packSize: 2,
      defaultDosesPerUnit: 5,
    } as DraftStockOutLineFragment;

    const draftLines = [line1, line2];

    const result = issueDoses(draftLines, '2', 18, true);
    expect(result).toEqual([
      line1,
      // 18 doses / 2 units per pack / 5 doses per unit = 1.8
      { ...line2, numberOfPacks: 1.8 },
    ]);
  });
});
