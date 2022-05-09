import {
  FieldSelectorControl,
  useFieldsSelector,
} from '@openmsupply-client/common';
import { ResponseFragment } from '../../operations.generated';
import { useResponse, useResponseNumber } from './useResponse';
import { useResponseApi } from '../utils/useResponseApi';

export const useResponseFields = <
  KeyOfRequisition extends keyof ResponseFragment
>(
  keys: KeyOfRequisition | KeyOfRequisition[]
): FieldSelectorControl<ResponseFragment, KeyOfRequisition> => {
  const { data } = useResponse();
  const responseNumber = useResponseNumber();
  const api = useResponseApi();

  return useFieldsSelector(
    api.keys.detail(responseNumber),
    () => api.get.byNumber(responseNumber),
    (patch: Partial<ResponseFragment>) =>
      api.update({ ...patch, id: data?.id ?? '' }),
    keys
  );
};
