import { getReasonOptionTypes } from './ReasonOptionsUtils';
import { ReasonOptionNodeType } from '@common/types';

describe('getReasonOptionTypes', () => {
  it('returns PositiveInventoryAdjustment when not inventory reduction', () => {
    expect(
      getReasonOptionTypes({
        isInventoryReduction: false,
        isVaccine: false,
        isDispensary: false,
      })
    ).toEqual([ReasonOptionNodeType.PositiveInventoryAdjustment]);
    expect(
      getReasonOptionTypes({
        isInventoryReduction: false,
        isVaccine: true,
        isDispensary: true,
      })
    ).toEqual([ReasonOptionNodeType.PositiveInventoryAdjustment]);
  });

  it('returns NegativeInventoryAdjustment when inventory reduction and not vaccine', () => {
    expect(
      getReasonOptionTypes({
        isInventoryReduction: true,
        isVaccine: false,
        isDispensary: false,
      })
    ).toEqual([ReasonOptionNodeType.NegativeInventoryAdjustment]);
    expect(
      getReasonOptionTypes({
        isInventoryReduction: true,
        isVaccine: false,
        isDispensary: true,
      })
    ).toEqual([ReasonOptionNodeType.NegativeInventoryAdjustment]);
  });

  it('returns ClosedVialWastage for vaccine, not dispensary', () => {
    expect(
      getReasonOptionTypes({
        isInventoryReduction: true,
        isVaccine: true,
        isDispensary: false,
      })
    ).toEqual([ReasonOptionNodeType.ClosedVialWastage]);
  });

  it('returns ClosedVialWastage and OpenVialWastage for vaccine and dispensary', () => {
    expect(
      getReasonOptionTypes({
        isInventoryReduction: true,
        isVaccine: true,
        isDispensary: true,
      })
    ).toEqual([
      ReasonOptionNodeType.ClosedVialWastage,
      ReasonOptionNodeType.OpenVialWastage,
    ]);
  });
});
