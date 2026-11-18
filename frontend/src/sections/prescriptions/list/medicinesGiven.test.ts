import { describe, expect, it } from 'vitest';
import { medicinesGiven, type GivenLine } from './medicinesGiven';

const line = (
  itemName: string,
  numberOfPacks: number,
  packSize = 1,
  type = 'STOCK_OUT'
): GivenLine => ({ type, itemName, numberOfPacks, packSize });

describe('medicinesGiven (spec/prescriptions rules › Dispensing records)', () => {
  // OMS-REG-DIS-12.215
  it('names each medicine with the amount given in its unit, in the order listed', () => {
    expect(
      medicinesGiven([line('Paracetamol 500mg', 2, 10), line('ORS sachet', 2)])
    ).toBe('Paracetamol 500mg (20), ORS sachet (2)');
  });

  // OMS-REG-DIS-12.216
  it('shows a medicine given from two batches once, with both amounts added', () => {
    expect(
      medicinesGiven([
        line('Amoxicillin 250mg', 1, 10),
        line('ORS sachet', 1),
        line('Amoxicillin 250mg', 0.5, 10),
      ])
    ).toBe('Amoxicillin 250mg (15), ORS sachet (1)');
  });

  // OMS-REG-DIS-12.217
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

  it('is empty for a record that gives nothing yet', () => {
    expect(medicinesGiven([])).toBe('');
  });
});
