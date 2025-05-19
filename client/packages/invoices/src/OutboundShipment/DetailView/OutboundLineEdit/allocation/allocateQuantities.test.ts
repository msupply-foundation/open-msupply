import { FnUtils } from '@openmsupply-client/common';
import { allocateQuantities } from './allocateQuantities';
import { DraftStockOutLineFragment } from '../../../api/operations.generated';
import { AllocateIn } from './useAllocationContext';

describe('allocateQuantities - standard behaviour.', () => {
  it('allocates quantity to a row', () => {
    const lineOne = createTestLine({ availablePacks: 10 });
    const draftLines = [lineOne];

    const expected = {
      allocatedLines: [{ ...lineOne, numberOfPacks: 3 }],
      remainingQuantity: 0,
    };

    expect(
      allocateQuantities(draftLines, 3, { allocateIn: AllocateIn.Units })
    ).toEqual(expected);
  });

  it('allocates quantity spread over multiple lines, first line first', () => {
    const one = createTestLine({ id: '1', availablePacks: 10 });
    const two = createTestLine({ id: '2', availablePacks: 10 });
    const draftLines = [one, two];

    const expected = [
      { ...one, numberOfPacks: 10 },
      { ...two, numberOfPacks: 5 },
    ];
    const allocated = allocateQuantities(draftLines, 15, {
      allocateIn: AllocateIn.Units,
    });

    expect(allocated?.allocatedLines).toEqual(expected);
    expect(allocated?.remainingQuantity).toEqual(0);
  });

  it('rounds up to the nearest number of packs (over-allocates)', () => {
    const lineOne = createTestLine({
      availablePacks: 10,
      packSize: 10,
    });
    const draftLines = [lineOne];

    const expected = [{ ...lineOne, numberOfPacks: 1 }];
    const allocated = allocateQuantities(draftLines, 5, {
      allocateIn: AllocateIn.Units,
    });

    expect(allocated?.allocatedLines).toEqual(expected);
    expect(allocated?.remainingQuantity).toEqual(-5); // over-allocated
  });

  it('returns remaining quantity when not enough available', () => {
    const lineOne = createTestLine({ availablePacks: 1 });
    const draftLines = [lineOne];

    const expected = [{ ...lineOne, numberOfPacks: 1 }];
    const allocated = allocateQuantities(draftLines, 5, {
      allocateIn: AllocateIn.Units,
    });

    expect(allocated?.allocatedLines).toEqual(expected);
    expect(allocated?.remainingQuantity).toEqual(4);
  });
});

describe('Allocate quantities - with differing pack sizes', () => {
  /* **********************************************************
   * input lines:  [{ availableNumberOfPacks: 1, packSize: 1 },
   *                { availableNumberOfPacks: 2, packSize: 2 }]
   * expected:     [{ numberOfPacks: 1}, { numberOfPacks: 1 }]
   ********************************************************** */
  it('allocates correct number of packs to each line', () => {
    const one = createTestLine({ id: '1' });
    const two = createTestLine({ id: '2', packSize: 2, availablePacks: 2 });

    const draftLines = [one, two];

    const expected = [
      { ...one, numberOfPacks: 1 },
      { ...two, numberOfPacks: 1 },
    ];
    const allocated = allocateQuantities(draftLines, 3, {
      allocateIn: AllocateIn.Units,
    });

    expect(allocated?.allocatedLines).toEqual(expected);
  });
});

describe('Allocated quantities - skips invalid lines', () => {
  it('does not allocate any quantity to invalid lines', () => {
    const now = Date.now();
    const expiredDate = new Date(now - 100000).toISOString();

    const expiredLine = createTestLine({ expiryDate: expiredDate });
    const onHoldLine = createTestLine({ onHold: true });
    const unavailableLine = createTestLine({ availablePacks: 0 });
    const allocatableLine = createTestLine({ availablePacks: 10 });

    const draftLines = [
      expiredLine,
      onHoldLine,
      unavailableLine,
      allocatableLine,
    ];

    expect(
      allocateQuantities(draftLines, 2, { allocateIn: AllocateIn.Units })
        ?.allocatedLines
    ).toEqual([
      expiredLine,
      onHoldLine,
      unavailableLine,
      { ...allocatableLine, numberOfPacks: 2 },
    ]);
  });
});

describe('Allocated quantities - coping with over-allocation', () => {
  const line1 = createTestLine({ id: '1', availablePacks: 5 });
  const line2PackSize10 = createTestLine({
    id: '2',
    availablePacks: 5,
    packSize: 10,
  });
  const line3 = createTestLine({ id: '3', availablePacks: 10 });

  it('skips large pack size to prevent over allocating', () => {
    const draftLines = [{ ...line1 }, { ...line2PackSize10 }, { ...line3 }];

    expect(
      allocateQuantities(draftLines, 7, { allocateIn: AllocateIn.Units })
    ).toEqual({
      allocatedLines: [
        { ...line1, numberOfPacks: 5 },
        { ...line2PackSize10, numberOfPacks: 0 },
        { ...line3, numberOfPacks: 2 },
      ],
      remainingQuantity: 0,
    });
  });

  it('reduces earlier lines to prevent over allocating', () => {
    const draftLines = [{ ...line1 }, { ...line2PackSize10 }];

    const { allocatedLines, remainingQuantity } = allocateQuantities(
      draftLines,
      20,
      { allocateIn: AllocateIn.Units }
    )!;

    expect(allocatedLines).toEqual([
      { ...line1, numberOfPacks: 0 },
      { ...line2PackSize10, numberOfPacks: 2 },
    ]);
    expect(remainingQuantity === 0).toBe(true);
  });

  it('reduces correct quantities based on pack size', () => {
    const lineOne = createTestLine({ availablePacks: 10, packSize: 1 }); // 10
    const lineTwo = createTestLine({ availablePacks: 10, packSize: 2 }); // 20
    const lineThree = createTestLine({ availablePacks: 10, packSize: 6 }); // 50
    const draftLines = [lineOne, lineTwo, lineThree];

    // first pass:
    // allocate 10 from line 1, 20 from line 2, and 12 from line 3 (total 42)
    // so try second pass:
    // round up line 3 to 18 (total 48)
    // third pass required to remove 5:
    // Can't remove from line 3 without under-allocating, so need to remove from line 2, then 1
    // Remove 2 * 2 from line 2 (4 units) -- (total 44)
    // Remove 1 * 1 from line 1 (1 unit) -- (total 43)

    const { allocatedLines, remainingQuantity } = allocateQuantities(
      draftLines,
      43,
      { allocateIn: AllocateIn.Units }
    )!;

    expect(allocatedLines).toEqual([
      { ...lineOne, numberOfPacks: 9 },
      { ...lineTwo, numberOfPacks: 8 },
      { ...lineThree, numberOfPacks: 3 },
    ]);
    expect(remainingQuantity === 0).toBe(true);
  });

  it('over-allocates if required to meet requested quantity', () => {
    const draftLines = [{ ...line1 }, { ...line2PackSize10 }];

    expect(
      allocateQuantities(draftLines, 47, { allocateIn: AllocateIn.Units })
    ).toEqual({
      allocatedLines: [
        { ...line1, numberOfPacks: 0 },
        { ...line2PackSize10, numberOfPacks: 5 }, // i.e. 50 packs
      ],
      remainingQuantity: -3, // over-allocated by 3
    });
  });
});

describe('Allocating in doses', () => {
  it('allocates quantity to a row', () => {
    const lineOne = createTestLine({
      availablePacks: 10,
      packSize: 5,
      dosesPerUnit: 2,
    });
    const draftLines = [lineOne];

    const doseQuantity = 20; // 5 units per pack * 2 doses per unit == 2 packs

    const result = allocateQuantities(draftLines, doseQuantity, {
      allocateIn: AllocateIn.Doses,
    });

    expect(result).toEqual({
      allocatedLines: [{ ...lineOne, numberOfPacks: 2 }],
      remainingQuantity: 0,
    });
  });

  it('correctly reduces earlier lines to prevent over allocating', () => {
    const lineOne = createTestLine({
      availablePacks: 3,
      packSize: 1,
      dosesPerUnit: 2,
    }); // 6 doses available
    const lineTwo = createTestLine({
      availablePacks: 10,
      packSize: 5,
      dosesPerUnit: 2,
    }); // 100 doses available
    const draftLines = [lineOne, lineTwo];

    const doseQuantity = 22;

    // should first allocate the 6 doses from line 1
    // then 20 doses (2 packs) from line 2 (as need to round to whole pack)
    // 26 is more than the requested 22, so should reduce line1 to 1 pack (2 doses)

    const { allocatedLines, remainingQuantity } = allocateQuantities(
      draftLines,
      doseQuantity,
      { allocateIn: AllocateIn.Doses }
    )!;

    expect(allocatedLines).toEqual([
      { ...lineOne, numberOfPacks: 1 },
      { ...lineTwo, numberOfPacks: 2 },
    ]);
    expect(remainingQuantity === 0).toBe(true);
  });
});

type TestLineParams = {
  id?: string;
  packSize?: number;
  availablePacks?: number;
  numberOfPacks?: number;
  onHold?: boolean;
  expiryDate?: string;
  dosesPerUnit?: number;
};

function createTestLine({
  id = FnUtils.generateUUID(),
  packSize = 1,
  availablePacks = 1,
  numberOfPacks = 0,
  onHold = false,
  expiryDate,
  dosesPerUnit = 1,
}: TestLineParams): DraftStockOutLineFragment {
  return {
    __typename: 'DraftOutboundShipmentLineNode',
    id,
    stockLineId: '',
    numberOfPacks,
    packSize,
    sellPricePerPack: 0,
    inStorePacks: availablePacks,
    availablePacks,
    expiryDate,
    stockLineOnHold: onHold,
    defaultDosesPerUnit: dosesPerUnit,
  };
}
