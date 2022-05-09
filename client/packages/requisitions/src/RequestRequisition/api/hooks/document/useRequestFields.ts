import {
  FieldSelectorControl,
  useFieldsSelector,
} from '@openmsupply-client/common';
import { useRequest, useRequestNumber } from './useRequest';
import { RequestFragment } from '../../operations.generated';
import { useRequestApi } from '../utils/useRequestApi';

export const useRequestFields = <
  KeyOfRequisition extends keyof RequestFragment
>(
  keys: KeyOfRequisition | KeyOfRequisition[]
): FieldSelectorControl<RequestFragment, KeyOfRequisition> => {
  const { data } = useRequest();
  const requestNumber = useRequestNumber();
  const api = useRequestApi();
  return useFieldsSelector(
    api.keys.detail(requestNumber),
    () => api.get.byNumber(requestNumber),

    (patch: Partial<RequestFragment>) =>
      api.update({ ...patch, id: data?.id ?? '' }),
    keys
  );
};
