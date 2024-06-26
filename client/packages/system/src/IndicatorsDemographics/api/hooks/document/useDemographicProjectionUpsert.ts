import { useQueryClient } from '@openmsupply-client/common';
import { DemographicProjectionFragment } from '../../operations.generated';
import { useDemographicProjectionInsert } from './useDemographicProjectionInsert';
import { useDemographicProjectionUpdate } from './useDemographicProjectionUpdate';
import { FnUtils } from '@common/utils';
import { useDemographicsApi } from '../utils/useDemographicApi';

export const useDemographicProjectionUpsert = () => {
  const queryClient = useQueryClient();
  const api = useDemographicsApi();

  const { mutateAsync: insert } = useDemographicProjectionInsert();
  const { mutateAsync: update } = useDemographicProjectionUpdate();

  const invalidateQueries = (baseYear: number) =>
    queryClient.invalidateQueries(api.keys.projection(baseYear));

  const upsertProjection = async (
    projection: Omit<DemographicProjectionFragment, '__typename'>
  ) => {
    if (!projection.id) {
      const result = await insert({
        ...projection,
        id: FnUtils.generateUUID(),
      });
      return result;
    } else {
      const result = await update(projection);
      return result;
    }
  };

  return {
    upsertProjection,
    invalidateQueries,
  };
};
