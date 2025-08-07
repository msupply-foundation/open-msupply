import { findCommonProgramItem } from './MassChangeCampaignOrProgramModal';
import { ProgramFragment } from '@openmsupply-client/programs';

const createProgram = (id: string, name: string): ProgramFragment => ({
  id,
  name,
  __typename: 'ProgramNode',
});

const ProgramA = createProgram('ProgramA', 'Program A');
const ProgramB = createProgram('ProgramB', 'Program B');
const ProgramC = createProgram('ProgramC', 'Program C');
const ProgramD = createProgram('ProgramD', 'Program D');

const createRow = (itemId: string, programs: ProgramFragment[]) => ({
  item: {
    id: itemId,
    programs,
  },
});

describe('findCommonProgramItem', () => {
  it('should return null and false for empty array', () => {
    const result = findCommonProgramItem([]);
    expect(result).toEqual({ itemId: null, hasMissingPrograms: false });
  });

  it('should return item id and false for single item', () => {
    const rows = [createRow('item1', [ProgramA, ProgramB])];
    const result = findCommonProgramItem(rows);
    expect(result).toEqual({ itemId: 'item1', hasMissingPrograms: false });
  });

  it('should return null and true when no common programs exist', () => {
    const rows = [
      createRow('itemA', [ProgramA, ProgramB, ProgramC]),
      createRow('itemB', [ProgramA]),
      createRow('itemC', [ProgramC]),
    ];
    const result = findCommonProgramItem(rows);
    expect(result).toEqual({ itemId: null, hasMissingPrograms: true });
  });

  it('should return item id and true when some programs are missing', () => {
    // Common program: ProgramA
    const rows = [
      createRow('itemA', [ProgramA, ProgramB, ProgramC]),
      createRow('itemB', [ProgramA]),
      createRow('itemC', [ProgramA, ProgramB]),
    ];
    const result = findCommonProgramItem(rows);
    expect(result).toEqual({ itemId: 'itemB', hasMissingPrograms: true });
  });

  it('should return item id and false when all items have identical programs', () => {
    const rows = [
      createRow('itemA', [ProgramA, ProgramB]),
      createRow('itemB', [ProgramA, ProgramB]),
      createRow('itemC', [ProgramA, ProgramB]),
    ];
    const result = findCommonProgramItem(rows);
    expect(result).toEqual({ itemId: 'itemA', hasMissingPrograms: false });
  });

  it('should handle complex scenario with overlapping programs', () => {
    // Common programs: ProgramA, ProgramB
    const rows = [
      createRow('itemA', [ProgramA, ProgramB, ProgramC]),
      createRow('itemB', [ProgramA, ProgramB]),
      createRow('itemC', [ProgramA, ProgramB, ProgramD]),
    ];
    const result = findCommonProgramItem(rows);
    expect(result).toEqual({ itemId: 'itemB', hasMissingPrograms: true });
  });
});
