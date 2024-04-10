import {
  useQueryClient,
  useMutation,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import { useResponseNumber } from '../document/useResponse';
import { useResponseFields } from '../document/useResponseFields';
import { useResponseApi } from './useResponseApi';

export const useCreateOutboundFromResponse = () => {
  const responseNumber = useResponseNumber();
  const queryClient = useQueryClient();
  const { error, warning } = useNotification();
  const t = useTranslation('distribution');
  const { id } = useResponseFields('id');
  const api = useResponseApi();
  return useMutation(() => api.createOutboundFromResponse(id), {
    onError: e => {
      const errorObj = e as Error;
      if (errorObj.message === 'NothingRemainingToSupply') {
        warning(t('warning.nothing-to-supply'))();
      } else {
        error(t('error.failed-to-create-outbound'))();
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries(api.keys.detail(responseNumber));
    },
  });
};
