import { FnUtils } from '@common/utils';
import { DraftStockOutLineFragment, AllocateInType, AllocateInOption } from '.';
import {
  canAutoAllocate,
  getAllocatedQuantity,
  getDoseQuantity,
  getManualAllocationAlerts,
  issue,
  unitsToQuantity,
} from './utils';

describe('getDoseQuantity', () => {
  it('calculates allocated doses based on doses per unit', () => {
    const line = {
      numberOfPacks: 5,
      packSize: 10,
      dosesPerUnit: 2,
    } as DraftStockOutLineFragment;

    const result = getDoseQuantity(line);
    expect(result).toBe(100);
  });

  it('handles doses per unit of 0, treat as 1 dose per unit', () => {
    const line = {
      numberOfPacks: 5,
      packSize: 10,
      dosesPerUnit: 0,
    } as DraftStockOutLineFragment;

    const result = getDoseQuantity(line);
    expect(result).toBe(50);
  });
});

describe('getAllocatedQuantity', () => {
  const draftLines = [
    { numberOfPacks: 2, packSize: 3, dosesPerUnit: 2 },
    {
      numberOfPacks: 5,
      packSize: 10,
      dosesPerUnit: 2,
    },
  ] as DraftStockOutLineFragment[];

  it('returns dose quantity when allocating in doses', () => {
    const result = getAllocatedQuantity({
      // line 1 uses default doses per unit, line 2 uses item variant doses per unit
      draftLines, // line1: 2*3*2=12, line2: 5*10*2=100 == 112
      allocateIn: { type: AllocateInType.Doses },
    });
    expect(result).toBe(112);
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
    dosesPerUnit: 2,
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
      dosesPerUnit: 2,
    } as DraftStockOutLineFragment;

    const draftLines = [line1, line2];

    const result = issue(draftLines, '2', 30, AllocateInType.Doses);
    expect(result).toEqual([
      line1,
      { ...line2, numberOfPacks: 3 }, // 30 doses / (5 units per pack * 2 dose per unit) = 3 packs
    ]);
  });

  it('updates based on units per dose', () => {
    const line2 = {
      id: '2',
      packSize: 5,
      dosesPerUnit: 2,
    } as DraftStockOutLineFragment;

    const draftLines = [line1, line2];

    const result = issue(draftLines, '2', 30, AllocateInType.Doses);
    expect(result).toEqual([
      line1,
      { ...line2, numberOfPacks: 3 }, // 30 doses / (5 units per pack * 2 dose per unit) = 3 packs
    ]);
  });

  it('handles doses per unit of 0', () => {
    const line2 = {
      id: '2',
      packSize: 5,
      dosesPerUnit: 0,
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
      dosesPerUnit: 5,
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
      dosesPerUnit: 5,
    } as DraftStockOutLineFragment;

    const draftLines = [line1, line2];

    const result = issue(draftLines, '2', 18, AllocateInType.Doses, true);
    expect(result).toEqual([
      line1,
      // 18 doses / 2 units per pack / 5 doses per unit = 1.8
      { ...line2, numberOfPacks: 1.8 },
    ]);
  });

  it('skips rounding if it would over-allocate the stock line', () => {
    const line2 = {
      id: '2',
      packSize: 2,
      dosesPerUnit: 5,
      availablePacks: 1.8,
    } as DraftStockOutLineFragment;

    const draftLines = [line1, line2];

    const result = issue(draftLines, '2', 16, AllocateInType.Doses);
    expect(result).toEqual([
      line1,
      // 16 doses / 2 units per pack / 5 doses per unit = 1.6
      // should round to 2, but can't, so round down
      { ...line2, numberOfPacks: 1 },
    ]);
  });
});

describe('canAutoAllocate ', () => {
  it('canAutoAllocateTests', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-12-15T12:00:00Z'));

    const availableLine = createTestLine({ availablePacks: 10 });
    expect(canAutoAllocate(availableLine, 0)).toEqual(true);

    const onHoldLine = createTestLine({
      availablePacks: 10,
      onHold: true,
    });
    expect(canAutoAllocate(onHoldLine, 0)).toEqual(false);
    const expiredLine = createTestLine({
      availablePacks: 10,
      expiryDate: '2023-01-01',

      onHold: false,
    });
    expect(canAutoAllocate(expiredLine, 0)).toEqual(false);

    // Tests the expiry threshold value
    const almostExpiredLine = createTestLine({
      availablePacks: 10,
      expiryDate: '2025-12-20',
      onHold: false,
    });
    expect(canAutoAllocate(almostExpiredLine, 10)).toEqual(false);

    const unusableVVMLine = createTestLine({
      availablePacks: 10,
      vvmStatus: { unusable: true },
    });
    expect(canAutoAllocate(unusableVVMLine, 0)).toEqual(false);
    const usableVVMExpiredLine = createTestLine({
      availablePacks: 10,
      expiryDate: '2023-01-01',
      vvmStatus: { unusable: true },
    });
    expect(canAutoAllocate(usableVVMExpiredLine, 0)).toEqual(false);

    const usableVVMLine = createTestLine({
      availablePacks: 10,
      vvmStatus: { unusable: false },
    });
    expect(canAutoAllocate(usableVVMLine, 0)).toEqual(true);

    const packSize2 = createTestLine({ packSize: 2 });
    expect(canAutoAllocate(packSize2, 0, 2)).toEqual(true);
    expect(canAutoAllocate(packSize2, 0, 3)).toEqual(false);
  });
});

describe('getManualAllocationAlerts', () => {
  const mockFormat = () => '';
  const mockT = (key: string) => key;

  it('returns empty array when no alerts', () => {
    const alerts = getManualAllocationAlerts(
      1,
      1,
      createTestLine({}),
      AllocateInType.Doses,
      mockFormat,
      mockT
    );

    expect(alerts).toEqual([]);
  });
  it('returns over-allocated warning when over-allocated', () => {
    const alerts = getManualAllocationAlerts(
      1,
      4,
      createTestLine({}),
      AllocateInType.Doses,
      mockFormat,
      mockT
    );

    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.message).toMatch('over-allocated');
  });

  it('returns partial pack warning when requested quantity is not a whole pack', () => {
    const alerts = getManualAllocationAlerts(
      7,
      7,
      createTestLine({ packSize: 10, numberOfPacks: 7 }),
      AllocateInType.Units,
      mockFormat,
      mockT
    );

    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.message).toMatch('partial-pack-warning');
  });
});

describe('unitsToQuantity', () => {
  it('converts units to doses (dosesPerUnit=2)', () => {
    const result = unitsToQuantity({ type: AllocateInType.Doses }, 5, 2);
    expect(result).toBe(10);
  });

  it('converts units to doses (dosesPerUnit=0, treat as 1)', () => {
    const result = unitsToQuantity({ type: AllocateInType.Doses }, 5, 0);
    expect(result).toBe(5);
  });

  it('converts units to units', () => {
    const result = unitsToQuantity({ type: AllocateInType.Units }, 7, 3);
    expect(result).toBe(7);
  });

  it('converts units to packs', () => {
    const result = unitsToQuantity(
      { type: AllocateInType.Packs, packSize: 10 },
      20,
      3
    );
    expect(result).toBe(2);
  });

  it('throws for unknown allocation type', () => {
    const badAllocateIn = { type: 'Unknown' } as unknown as AllocateInOption;
    expect(() => unitsToQuantity(badAllocateIn, 1, 1)).toThrow();
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
    dosesPerUnit: 0,
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
