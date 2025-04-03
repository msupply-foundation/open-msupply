import {
  FieldSelectorControl,
  useFieldsSelector,
} from '@openmsupply-client/common';
import { useRequest, useRequestId } from './useRequest';
import { RequestFragment } from '../../.';
import { useRequestApi } from '../utils/useRequestApi';

export const useRequestFields = <
  KeyOfRequisition extends keyof RequestFragment,
>(
  keys: KeyOfRequisition | KeyOfRequisition[]
): FieldSelectorControl<RequestFragment, KeyOfRequisition> => {
  const { data } = useRequest();
  const requestId = useRequestId();
  const api = useRequestApi();
  return useFieldsSelector(
    api.keys.detail(requestId),
    () => api.get.byId(requestId),

    (patch: Partial<RequestFragment>) =>
      api.update({ ...patch, id: data?.id ?? '' }),
    keys
  );
};
