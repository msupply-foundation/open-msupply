import { describe, expect, it } from 'vitest';
import { toSaveLineInputs } from './saveLineInputs';

// OMS-REG-DIST-03.21's untouched-values half, at the wire seam: the item-set save
// OVERWRITES receivedNumberOfPacks and reasonOptionId on every updated line
// (contract § issuing lines wire trap), so the mapping must echo the draft's
// stored values — never omit them, never fake a blank received count from the
// issued packs.

const line = (
  over: Partial<Parameters<typeof toSaveLineInputs>[0][number]> = {}
) => ({
  id: 'l1',
  numberOfPacks: 4,
  stockLineId: 's1',
  receivedNumberOfPacks: null,
  reasonOption: null,
  vvmStatus: null,
  ...over,
});

describe('toSaveLineInputs', () => {
  it('echoes a stored received count and variance reason unchanged', () => {
    expect(
      toSaveLineInputs([
        line({ receivedNumberOfPacks: 3, reasonOption: { id: 'r1' } }),
      ])
    ).toEqual([
      {
        id: 'l1',
        numberOfPacks: 4,
        stockLineId: 's1',
        receivedNumberOfPacks: 3,
        reasonOptionId: 'r1',
        vvmStatusId: null,
      },
    ]);
  });

  it('echoes the batch\'s stored VVM status — an omitted id STRIPS it (contract wire trap)', () => {
    const [input] = toSaveLineInputs([
      line({
        vvmStatus: { id: 'v1', description: 'Stage 1', unusable: false, priority: 1 },
      }),
    ]);
    expect(input?.vvmStatusId).toBe('v1');
  });

  it('a status-less line sends null, not a fabricated id', () => {
    const [input] = toSaveLineInputs([line()]);
    expect(input?.vvmStatusId).toBeNull();
  });

  it('a blank received count stays blank — never faked from issued packs', () => {
    const [input] = toSaveLineInputs([line()]);
    expect(input?.receivedNumberOfPacks).toBeNull();
    expect(input?.reasonOptionId).toBeNull();
  });

  it('a received count of zero is a recorded value, not blank', () => {
    const [input] = toSaveLineInputs([line({ receivedNumberOfPacks: 0 })]);
    expect(input?.receivedNumberOfPacks).toBe(0);
  });
});
