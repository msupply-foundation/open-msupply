import { ArrayUtils } from './ArrayUtils';

describe('ArrayUtils', () => {
  it('is defined', () => {
    expect(ArrayUtils.ifTheSameElseDefault).toBeDefined();
    expect(ArrayUtils.getUnitQuantity).toBeDefined();
    expect(ArrayUtils.getSum).toBeDefined();
    expect(ArrayUtils.immutablePatch).toBeDefined();
  });

  it('ifTheSameElseDefault', () => {
    const someEntities = [
      { unit: 'tablet', quantity: 1, type: 'item' },
      { unit: 'tablet', quantity: 2, type: 'item' },
      { unit: 'tablet', quantity: 2, type: 'item' },
      { unit: 'bottle', quantity: 1, type: 'item' },
      { unit: 'bottle', quantity: 2, type: 'item' },
      { unit: 'bottle', quantity: 3, type: 'item' },
    ];
    expect(
      ArrayUtils.ifTheSameElseDefault(someEntities, 'unit', 'default')
    ).toBe('default');
    expect(
      ArrayUtils.ifTheSameElseDefault(someEntities, 'type', 'default')
    ).toBe('item');
  });

  it('getUnitQuantity', () => {
    const arr1 = [
      {
        numberOfPacks: 10,
        packSize: 1,
      },
    ];
    const arr2 = [
      {
        numberOfPacks: 10,
        packSize: 1,
      },
      {
        numberOfPacks: 10,
        packSize: 10,
      },
      {
        numberOfPacks: 2,
        packSize: 5,
      },
    ];
    expect(ArrayUtils.getUnitQuantity(arr1)).toBe(10);
    expect(ArrayUtils.getUnitQuantity(arr2)).toBe(120);
  });

  it('getSum', () => {
    const arr1 = [{ value: 1 }, { value: 2 }, { value: 3 }];
    expect(ArrayUtils.getSum(arr1, 'value')).toBe(6);
    const arr2 = [{ value: 1 }, { value: 0.2 }, { value: 0.3 }];
    expect(ArrayUtils.getSum(arr2, 'value')).toBe(1.5);
  });

  it('immutablePatch', () => {
    const arr: { id: string; unit: string }[] = [
      { id: '1', unit: 'bottle' },
      { id: '2', unit: 'bottle' },
      { id: '3', unit: 'tablet' },
    ];
    const newArray = ArrayUtils.immutablePatch(arr, {
      id: '2',
      unit: 'capsule',
    });

    expect(newArray[0]?.unit).toBe('bottle');
    expect(newArray[1]?.unit).toBe('capsule');
    expect(arr[1]?.unit).toBe('bottle');
  });

  it('is returns average cost per unit', () => {
    const arr1 = [
      {
        costPricePerPack: 2,
        numberOfPacks: 10,
        packSize: 1,
      },
    ];
    const arr2 = [
      {
        costPricePerPack: 2,
        numberOfPacks: 10,
        packSize: 1,
      },
      {
        costPricePerPack: 30,
        numberOfPacks: 1,
        packSize: 10,
      },
      {
        costPricePerPack: 5,
        numberOfPacks: 2,
        packSize: 5,
      },
    ];
    const arr3 = [
      {
        costPricePerPack: 0,
        numberOfPacks: 0,
        packSize: 1,
      },
    ];
    expect(ArrayUtils.getUnitCostPrice(arr1)).toBe(2);
    expect(ArrayUtils.getUnitCostPrice(arr2)).toBe(2);
    expect(ArrayUtils.getUnitCostPrice(arr3)).toBe(0);
  });
});
