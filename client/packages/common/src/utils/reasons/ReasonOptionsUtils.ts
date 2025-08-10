import { ReasonOptionNodeType } from '@common/types';

export interface ReasonOptionTypesParams {
  isInventoryReduction: boolean;
  isVaccine: boolean;
  isDispensary: boolean;
}

export const getReasonOptionTypes = ({
  isInventoryReduction,
  isVaccine,
  isDispensary,
}: ReasonOptionTypesParams): ReasonOptionNodeType[] => {
  if (!isInventoryReduction) {
    return [ReasonOptionNodeType.PositiveInventoryAdjustment];
  }

  if (!isVaccine) {
    return [ReasonOptionNodeType.NegativeInventoryAdjustment];
  }

  // Vaccine items have their own set of reasons for negative inventory adjustments
  const negativeVaccineReasons = [ReasonOptionNodeType.ClosedVialWastage];

  // Dispensaries can also have open vial wastage
  if (isDispensary)
    negativeVaccineReasons.push(ReasonOptionNodeType.OpenVialWastage);

  return negativeVaccineReasons;
};
