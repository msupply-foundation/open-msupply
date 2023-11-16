import { useTemperatureBreachApi } from '../utils/useTemperatureBreachesApi';
import { AuthError, LocalStorage, useQuery } from '@openmsupply-client/common';
import { ListParams } from '../../api';

export const useTemperatureBreaches = (queryParams: ListParams) => {
  const api = useTemperatureBreachApi();

  return useQuery(api.keys.paramList(queryParams), () =>
    api.get
      .list(queryParams)()
      // to allow breach notifications, the `temperatureBreaches` query is exempted in GqlContext
      // for permission errors. Permission errors will need to be displayed for 'normal' breach queries however
      // which is what the below will do
      .catch(e => {
        if (e.message === AuthError.PermissionDenied)
          LocalStorage.setItem('/auth/error', AuthError.PermissionDenied);
      })
  );
};
