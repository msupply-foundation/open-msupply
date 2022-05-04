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
});
