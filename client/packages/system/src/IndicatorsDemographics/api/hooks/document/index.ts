export * from '../../../../Item/api/hooks/useVaccineItem/useVaccineItems';

import { useDemographics } from './useDemographics';
import { useDemographicIndicator } from './useDemographicIndicator';
import { useDemographicIndicators } from './useDemographicIndicators';
import { useDemographicIndicatorInsert } from './useDemographicIndicatorInsert';
import { useDemographicIndicatorUpdate } from './useDemographicIndicatorUpdate';
import { useDemographicProjections } from './useDemographicProjections';
import { useDemographicProjectionUpsert } from './useDemographicProjectionUpsert';
import { useDemographicProjection } from './useDemographicProjection';
import { useVaccineItems } from '../../../../Item/api/hooks/useVaccineItem/useVaccineItems';

export const Document = {
  useDemographics,
  useDemographicIndicator,
  useDemographicIndicators,
  useDemographicIndicatorInsert,
  useDemographicIndicatorUpdate,
  useDemographicProjections,
  useDemographicProjection,
  useDemographicProjectionUpsert,
  useVaccineItems,
};
