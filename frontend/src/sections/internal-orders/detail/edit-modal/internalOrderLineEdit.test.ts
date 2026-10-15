import { describe, expect, it } from 'vitest';
import { modeToUnits, unitsToMode } from './internalOrderLineEdit';

// The requested quantity's entry modes (OMS-REG-REPL-04.69): entered in units,
// packs or doses, stored as units — doses rounded UP to whole units. Typing a
// dose count no longer runs away (#1334); that half is NumberField's echo
// guard, which this conversion feeds.
describe('requested quantity entry modes (OMS-REG-REPL-04.69)', () => {
  it('stores units as entered', () => {
    expect(modeToUnits(7, 'units', 10, 20)).toBe(7);
  });

  it('stores packs times the default pack size', () => {
    expect(modeToUnits(1.5, 'packs', 10, 20)).toBe(15);
  });

  it('stores a whole-vial dose count as whole units', () => {
    expect(modeToUnits(120, 'doses', 1, 20)).toBe(6);
  });

  it('rounds a part-vial dose count up to the next whole unit', () => {
    expect(modeToUnits(125, 'doses', 1, 20)).toBe(7);
    expect(modeToUnits(1, 'doses', 1, 20)).toBe(1);
  });

  it('re-expresses the stored units in doses', () => {
    expect(unitsToMode(7, 'doses', 1, 20)).toBe(140);
  });

  it('round-trips a whole-vial dose count unchanged', () => {
    const units = modeToUnits(120, 'doses', 1, 20);
    expect(unitsToMode(units, 'doses', 1, 20)).toBe(120);
  });
});
