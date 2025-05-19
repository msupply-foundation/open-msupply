import { SortUtils } from './SortUtils';

describe('SortUtils', () => {
  it('is defined', () => {
    expect(SortUtils.byExpiryAsc).toBeDefined();
    expect(SortUtils.byExpiryDesc).toBeDefined();
    expect(SortUtils.getColumnSorter).toBeDefined();
    expect(SortUtils.getDataSorter).toBeDefined();
  });

  const someEntities = [
    { id: '1', expiryDate: '2022/05/01', quantity: 5, unit: 'tablet' },
    { id: '2', expiryDate: '2020/05/01', quantity: 5, unit: 'capsule' },
    { id: '3', expiryDate: '2022/05/05', quantity: 12, unit: 'bottle' },
    { id: '4', expiryDate: '2022/04/01', quantity: 7, unit: 'capsule' },
  ];

  it('byExpiryAsc', () => {
    const sortedEntities = someEntities.sort(SortUtils.byExpiryAsc);
    const sortedIds = sortedEntities.map(entity => entity.id).join(',');
    expect(sortedIds).toBe('2,4,1,3');
  });

  it('byExpiryDesc', () => {
    const sortedEntities = someEntities.sort(SortUtils.byExpiryDesc);
    const sortedIds = sortedEntities.map(entity => entity.id).join(',');
    expect(sortedIds).toBe('3,1,4,2');
  });

  it('getDataSorter', () => {
    someEntities.sort(SortUtils.getDataSorter('quantity', false));
    expect(someEntities.map(entity => entity.id).join(',')).toBe('1,2,4,3');

    someEntities.sort(SortUtils.getDataSorter('quantity', true));
    expect(someEntities.map(entity => entity.id).join(',')).toBe('3,4,1,2');

    someEntities.sort(SortUtils.getDataSorter('unit', false));
    expect(someEntities.map(entity => entity.id).join(',')).toBe('3,4,2,1');
  });

  describe('byVVMStatusAsc', () => {
    const entities = [
      { id: 'vvm_none_none', vvmStatus: null }, // no vvmStatus & no expiryDate
      { id: 'vvm_none_2023_07_01', expiryDate: '2023/07/01' }, // no vvmStatus
      { id: 'vvm_none_2023_04_01', expiryDate: '2023/04/01' }, // no vvmStatus
      {
        id: 'vvm2_2023_05_01',
        vvmStatus: { level: 2 },
        expiryDate: '2023/05/01',
      },
      {
        id: 'vvm1_none',
        vvmStatus: { level: 1 },
      },
      {
        id: 'vvm1_2023_06_01',
        vvmStatus: { level: 1 },
        expiryDate: '2023/06/01',
      },
      {
        id: 'vvm1_2024_03_01',
        vvmStatus: { level: 1 },
        expiryDate: '2023/03/01',
      },
    ];

    it('sorts by vvmStatus.level ascending, then expiryDate', () => {
      const sorted = entities.sort(SortUtils.byVVMStatusAsc);
      // vvmStatus.level 1, then 2, then none
      // then sort by expiryDate
      // No expiryDate goes to the end
      expect(sorted.map(e => e.id)).toEqual([
        'vvm1_2024_03_01',
        'vvm1_2023_06_01',
        'vvm1_none',
        'vvm2_2023_05_01',
        'vvm_none_2023_04_01',
        'vvm_none_2023_07_01',
        'vvm_none_none',
      ]);
    });

    it('puts items with vvmStatus before those without', () => {
      const testEntities = [
        { id: 'a', expiryDate: '2023/01/01' },
        { id: 'b', vvmStatus: { level: 3 }, expiryDate: '2023/01/01' },
      ];
      const sorted = testEntities.sort(SortUtils.byVVMStatusAsc);
      expect(sorted.map(e => e.id)).toEqual(['b', 'a']);
    });

    it('sorts by expiryDate if neither has vvmStatus', () => {
      const testEntities = [
        { id: 'a', expiryDate: '2023/01/01' },
        { id: 'b', expiryDate: '2022/01/01' },
      ];
      const sorted = testEntities.sort(SortUtils.byVVMStatusAsc);
      expect(sorted.map(e => e.id)).toEqual(['b', 'a']);
    });

    it('sorts by expiryDate if vvmStatus.level is equal', () => {
      const testEntities = [
        { id: 'a', vvmStatus: { level: 2 }, expiryDate: '2023/01/01' },
        { id: 'b', vvmStatus: { level: 2 }, expiryDate: '2022/01/01' },
      ];
      const sorted = testEntities.sort(SortUtils.byVVMStatusAsc);
      expect(sorted.map(e => e.id)).toEqual(['b', 'a']);
    });
  });
});
