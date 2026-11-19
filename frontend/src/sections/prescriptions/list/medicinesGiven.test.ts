import { describe, expect, it } from 'vitest';
import { medicinesGiven, type GivenLine } from './medicinesGiven';

const line = (
  itemName: string,
  numberOfPacks: number,
  packSize = 1,
  type = 'STOCK_OUT',
  itemId = itemName
): GivenLine => ({ type, itemId, itemName, numberOfPacks, packSize });

describe('medicinesGiven (spec/prescriptions rules › Dispensing records)', () => {
  // OMS-REG-DIS-12.216
  it('names each medicine with the amount given in its unit, in name order as the record lists them', () => {
    expect(
      medicinesGiven([line('Paracetamol 500mg', 2, 10), line('ORS sachet', 2)])
    ).toBe('ORS sachet (2), Paracetamol 500mg (20)');
  });

  // OMS-REG-DIS-12.216: the server returns a record's lines in no set order
  it('names them in the same order whatever order the lines come in', () => {
    const lines = [
      line('Zinc 20mg', 1),
      line('Amoxicillin 250mg', 1, 10),
      line('ORS sachet', 1),
    ];
    const expected = 'Amoxicillin 250mg (10), ORS sachet (1), Zinc 20mg (1)';
    expect(medicinesGiven(lines)).toBe(expected);
    expect(medicinesGiven([...lines].reverse())).toBe(expected);
  });

  // OMS-REG-DIS-12.217
  it('shows a medicine given from two batches once, with both amounts added', () => {
    expect(
      medicinesGiven([
        line('Amoxicillin 250mg', 1, 10),
        line('ORS sachet', 1),
        line('Amoxicillin 250mg', 0.5, 10),
      ])
    ).toBe('Amoxicillin 250mg (15), ORS sachet (1)');
  });

  // OMS-REG-DIS-12.232
  it('names two medicines that share a name separately, each with its own amount', () => {
    expect(
      medicinesGiven([
        line('Amoxicillin', 2, 10, 'STOCK_OUT', 'amox-tablets'),
        line('Amoxicillin', 1, 100, 'STOCK_OUT', 'amox-syrup'),
      ])
    ).toBe('Amoxicillin (20), Amoxicillin (100)');
  });

  // OMS-REG-DIS-12.218
  it('leaves out a placeholder that gives nothing, and services', () => {
    expect(
      medicinesGiven([
        line('Ibuprofen 200mg', 0, 0, 'UNALLOCATED_STOCK'),
        line('Consultation', 1, 1, 'SERVICE'),
        line('ORS sachet', 3),
      ])
    ).toBe('ORS sachet (3)');
  });

  it('adds fractional packs without float dust', () => {
    expect(medicinesGiven([line('Syrup', 0.1, 3), line('Syrup', 0.2, 3)])).toBe(
      'Syrup (0.9)'
    );
  });

  // OMS-REG-DIS-12.233
  it('writes each amount the way the caller asks, for a file', () => {
    expect(medicinesGiven([line('Syrup', 1, 2 / 3)], String)).toBe(
      'Syrup (0.666666667)'
    );
  });

  it('is empty for a record that gives nothing yet', () => {
    expect(medicinesGiven([])).toBe('');
  });
});
