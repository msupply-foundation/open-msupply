import { FnUtils } from '@common/utils';
import { DraftStockOutLineFragment, AllocateInType } from '.';
import {
  canAutoAllocate,
  getAllocatedQuantity,
  getDoseQuantity,
  issue,
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
      allocateIn: { type: AllocateInType.Doses },
    });
    expect(result).toBe(162);
  });

  it('returns unit quantity when allocating in units', () => {
    const result = getAllocatedQuantity({
      draftLines, // line1: 2*3=6, line2: 5*10=50 == 56
      allocateIn: { type: AllocateInType.Units },
    });
    expect(result).toBe(56);
  });

  it('returns pack quantity when allocating in packs', () => {
    const result = getAllocatedQuantity({
      draftLines, // line1: 2*3=6 units (.6 pack size 10s), line2: 5*10=50 units (5 packs) == 5.6
      allocateIn: { type: AllocateInType.Packs, packSize: 10 },
    });
    expect(result).toBe(5.6);
  });
});

describe('issue = in packs', () => {
  it('updates the number of packs for the specified line', () => {
    const draftLines = [
      { id: '1', numberOfPacks: 2, packSize: 10 },
      { id: '2', numberOfPacks: 3, packSize: 5 },
    ] as DraftStockOutLineFragment[];

    const result = issue(draftLines, '1', 5, AllocateInType.Packs);
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

    const result = issue(draftLines, '3', 5, AllocateInType.Packs);
    expect(result).toEqual(draftLines);
  });
});

describe('issue = doses', () => {
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

    const result = issue(draftLines, '3', 5, AllocateInType.Doses);
    expect(result).toEqual(draftLines);
  });

  it('updates the number of packs for the specified line, based on default units per dose and pack size', () => {
    const line2 = {
      id: '2',
      packSize: 5,
      defaultDosesPerUnit: 2,
    } as DraftStockOutLineFragment;

    const draftLines = [line1, line2];

    const result = issue(draftLines, '2', 30, AllocateInType.Doses);
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

    const result = issue(draftLines, '2', 30, AllocateInType.Doses);
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

    const result = issue(draftLines, '2', 30, AllocateInType.Doses);
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

    const result = issue(draftLines, '2', 18, AllocateInType.Doses);
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

    const result = issue(draftLines, '2', 18, AllocateInType.Doses, true);
    expect(result).toEqual([
      line1,
      // 18 doses / 2 units per pack / 5 doses per unit = 1.8
      { ...line2, numberOfPacks: 1.8 },
    ]);
  });
});

describe('canAutoAllocate ', () => {
  it('canAutoAllocateTests', () => {
    const availableLine = createTestLine({ availablePacks: 10 });
    expect(canAutoAllocate(availableLine)).toEqual(true);

    const onHoldLine = createTestLine({
      availablePacks: 10,
      onHold: true,
    });
    expect(canAutoAllocate(onHoldLine)).toEqual(false);
    const expiredLine = createTestLine({
      availablePacks: 10,
      expiryDate: '2023-01-01',

      onHold: false,
    });
    expect(canAutoAllocate(expiredLine)).toEqual(false);

    const unusableVVMLine = createTestLine({
      availablePacks: 10,
      vvmStatus: { unusable: true },
    });
    expect(canAutoAllocate(unusableVVMLine)).toEqual(false);
    const usableVVMExpiredLine = createTestLine({
      availablePacks: 10,
      expiryDate: '2023-01-01',
      vvmStatus: { unusable: true },
    });
    expect(canAutoAllocate(usableVVMExpiredLine)).toEqual(false);

    const usableVVMLine = createTestLine({
      availablePacks: 10,
      vvmStatus: { unusable: false },
    });
    expect(canAutoAllocate(usableVVMLine)).toEqual(true);

    const packSize2 = createTestLine({ packSize: 2 });
    expect(canAutoAllocate(packSize2, 2)).toEqual(true);
    expect(canAutoAllocate(packSize2, 3)).toEqual(false);
  });
});

type TestLineParams = {
  id?: string;
  packSize?: number;
  availablePacks?: number;
  numberOfPacks?: number;
  onHold?: boolean;
  expiryDate?: string;
  vvmStatus?: { level?: number; unusable?: boolean } | null;
};

function createTestLine({
  id = FnUtils.generateUUID(),
  packSize = 1,
  availablePacks = 1,
  numberOfPacks = 0,
  onHold = false,
  expiryDate,
  vvmStatus = null,
}: TestLineParams): DraftStockOutLineFragment {
  return {
    __typename: 'DraftStockOutLineNode',
    id,
    stockLineId: '',
    numberOfPacks,
    packSize,
    sellPricePerPack: 0,
    inStorePacks: availablePacks,
    availablePacks,
    expiryDate,
    stockLineOnHold: onHold,
    defaultDosesPerUnit: 0,
    vvmStatus: vvmStatus
      ? {
          __typename: 'VvmstatusNode',
          description: 'status meaning...',
          id: 'vvmStatusId' + id,
          level: 1,
          unusable: false,
          ...vvmStatus,
        }
      : null,
  };
}
