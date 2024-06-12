import { DemographicProjectionFragment } from '../../operations.generated';
import { useDemographicProjectionInsert } from './useDemographicProjectionInsert';
import { useDemographicProjectionUpdate } from './useDemographicProjectionUpdate';

export const useDemographicProjectionUpsert = () => {
  const { mutateAsync: insert } = useDemographicProjectionInsert();
  const { mutateAsync: update } = useDemographicProjectionUpdate();

  return async (
    projection: Omit<DemographicProjectionFragment, '__typename'>
  ) => {
    if (!projection.id) {
      const result = await insert(projection);
      return result;
    } else {
      const result = await update(projection);
      return result;
    }
  };
};
