import { ReasonOptionNodeType } from '@common/types';

export const getReasonOptionType = (
  isInventoryReduction: boolean,
  isVaccine: boolean
): ReasonOptionNodeType | ReasonOptionNodeType[] => {
  if (isInventoryReduction && isVaccine)
    return [
      ReasonOptionNodeType.NegativeInventoryAdjustment,
      ReasonOptionNodeType.OpenVialWastage,
    ];
  if (isInventoryReduction)
    return ReasonOptionNodeType.NegativeInventoryAdjustment;
  return ReasonOptionNodeType.PositiveInventoryAdjustment;
};
