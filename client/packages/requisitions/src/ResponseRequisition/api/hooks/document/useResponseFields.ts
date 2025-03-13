import {
  FieldSelectorControl,
  useFieldsSelector,
} from '@openmsupply-client/common';
import { ResponseFragment } from '../../operations.generated';
import { useResponse, useResponseId } from './useResponse';
import { useResponseApi } from '../utils/useResponseApi';

export const useResponseFields = <
  KeyOfRequisition extends keyof ResponseFragment
>(
  keys: KeyOfRequisition | KeyOfRequisition[]
): FieldSelectorControl<ResponseFragment, KeyOfRequisition> => {
  const { data } = useResponse();
  const responseId = useResponseId();
  const api = useResponseApi();

  return useFieldsSelector(
    api.keys.detail(responseId),
    () => api.get.byId(responseId),
    (patch: Partial<ResponseFragment>) =>
      api.update({ ...patch, id: data?.id ?? '' }),
    keys
  );
};
