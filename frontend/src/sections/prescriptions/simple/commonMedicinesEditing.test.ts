import { describe, expect, it } from 'vitest';
import {
  draftFrom,
  hasRepeats,
  newRow,
  reordered,
  repeatedPlaces,
  saveInput,
} from './commonMedicinesEditing';

const item = (id: string) => ({
  id,
  code: id.toUpperCase(),
  name: `Medicine ${id}`,
  unitName: 'Tab',
});

// spec/prescriptions rules › setting up the common medicines
describe('the common medicines editor', () => {
  it('reads the saved list in its order, each medicine with its three places (OMS-REG-DIS-12.381)', () => {
    const { rows, dropped } = draftFrom(
      [
        { itemId: 'b', amounts: [10, 20] },
        { itemId: 'a', amounts: [] },
      ],
      [item('a'), item('b')]
    );
    expect(rows.map(row => row.item.id)).toEqual(['b', 'a']);
    expect(rows[0].amounts).toEqual([10, 20, undefined]);
    expect(rows[1].amounts).toEqual([undefined, undefined, undefined]);
    expect(dropped).toBe(0);
  });

  it('leaves out and counts a medicine that is no longer an active stock item (OMS-REG-DIS-12.396)', () => {
    const { rows, dropped } = draftFrom(
      [
        { itemId: 'a', amounts: [1] },
        { itemId: 'gone', amounts: [2] },
        { itemId: 'b', amounts: [3] },
      ],
      [item('a'), item('b')]
    );
    expect(rows.map(row => row.item.id)).toEqual(['a', 'b']);
    expect(dropped).toBe(1);
    expect(saveInput(rows).map(medicine => medicine.itemId)).toEqual([
      'a',
      'b',
    ]);
  });

  it('adds a medicine with no amounts (OMS-REG-DIS-12.384)', () => {
    expect(newRow(item('c'))).toEqual({
      item: item('c'),
      amounts: [undefined, undefined, undefined],
    });
    expect(saveInput([newRow(item('c'))])).toEqual([
      { itemId: 'c', amounts: [] },
    ]);
  });

  it('saves the amounts closed up in the order typed (OMS-REG-DIS-12.388)', () => {
    expect(
      saveInput([
        { item: item('a'), amounts: [undefined, 30, 10] },
        { item: item('b'), amounts: [5, undefined, undefined] },
      ])
    ).toEqual([
      { itemId: 'a', amounts: [30, 10] },
      { itemId: 'b', amounts: [5] },
    ]);
  });

  it('marks the later of two places holding the same amount (OMS-REG-DIS-12.390)', () => {
    expect(repeatedPlaces([10, 20, 10])).toEqual([false, false, true]);
    expect(repeatedPlaces([10, undefined, undefined])).toEqual([
      false,
      false,
      false,
    ]);
    expect(
      hasRepeats([
        { item: item('a'), amounts: [10, 20, undefined] },
        { item: item('b'), amounts: [5, 5, undefined] },
      ])
    ).toBe(true);
    expect(hasRepeats([{ item: item('a'), amounts: [10, 20, 30] }])).toBe(
      false
    );
  });

  it('puts the medicines in a new order, as the saved list (OMS-REG-DIS-12.386)', () => {
    const rows = [newRow(item('a')), newRow(item('b')), newRow(item('c'))];
    const moved = reordered(rows, ['c', 'a', 'b']);
    expect(moved.map(row => row.item.id)).toEqual(['c', 'a', 'b']);
    // The same rows, moved: the editor's draft keeps each row's identity.
    expect(moved[0]).toBe(rows[2]);
    expect(saveInput(moved).map(medicine => medicine.itemId)).toEqual([
      'c',
      'a',
      'b',
    ]);
  });
});
