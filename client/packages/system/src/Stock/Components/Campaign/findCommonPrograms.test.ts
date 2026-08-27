import { findCommonPrograms } from './MassChangeCampaignOrProgramModal';
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

describe('findCommonPrograms', () => {
  it('should return empty array and false for empty array', () => {
    const result = findCommonPrograms([]);
    expect(result).toEqual({ validPrograms: [], hasMissingPrograms: false });
  });

  it('should return all programs and false for single item', () => {
    const rows = [createRow('item1', [ProgramA, ProgramB])];
    const result = findCommonPrograms(rows);
    expect(result).toEqual({
      validPrograms: [ProgramA, ProgramB],
      hasMissingPrograms: false,
    });
  });

  it('should return empty array and true when no common programs exist', () => {
    const rows = [
      createRow('itemA', [ProgramA, ProgramB, ProgramC]),
      createRow('itemB', [ProgramA]),
      createRow('itemC', [ProgramC]),
    ];
    const result = findCommonPrograms(rows);
    expect(result).toEqual({ validPrograms: [], hasMissingPrograms: true });
  });

  it('should return common programs and true when some programs are missing', () => {
    // Common program: ProgramA, Program B
    const rows = [
      createRow('itemA', [ProgramA, ProgramB, ProgramC]),
      createRow('itemB', [ProgramA]),
      createRow('itemC', [ProgramA, ProgramB]),
    ];
    const result = findCommonPrograms(rows);
    expect(result).toEqual({
      validPrograms: [ProgramA],
      hasMissingPrograms: true,
    });
  });

  it('should return all programs and false when all items have identical programs', () => {
    const rows = [
      createRow('itemA', [ProgramA, ProgramB]),
      createRow('itemB', [ProgramA, ProgramB]),
      createRow('itemC', [ProgramA, ProgramB]),
    ];
    const result = findCommonPrograms(rows);
    expect(result).toEqual({
      validPrograms: [ProgramA, ProgramB],
      hasMissingPrograms: false,
    });
  });

  it('should handle complex scenario with overlapping programs', () => {
    // Common programs: ProgramA, ProgramB
    const rows = [
      createRow('itemB', [ProgramA, ProgramB]),
      createRow('itemC', [ProgramA, ProgramB, ProgramD]),
    ];
    const result = findCommonPrograms(rows);
    expect(result).toEqual({
      validPrograms: [ProgramA, ProgramB],
      hasMissingPrograms: true,
    });
  });

  it('should handle partially overlapping programs', () => {
    // Common programs: ProgramB
    const rows = [
      createRow('itemA', [ProgramA, ProgramB]),
      createRow('itemB', [ProgramB, ProgramC]),
    ];
    const result = findCommonPrograms(rows);
    expect(result).toEqual({
      validPrograms: [ProgramB],
      hasMissingPrograms: true,
    });
  });
});
