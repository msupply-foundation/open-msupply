import { AppRoute } from '@openmsupply-client/config';
import { useMemo } from 'react';
import {
  RouteBuilder,
  useOpenInNewTab,
  useQueryClient,
  useAuthContext,
  useParams,
  useOmSupplyApi,
  UseQueryResult,
  useQuery,
  FieldSelectorControl,
  useFieldsSelector,
  SortController,
  useSortBy,
  getDataSorter,
  useQueryParams,
  useMutation,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import { getResponseQueries, ListParams } from './api';
import { isResponseDisabled } from './../../utils';
import {
  getSdk,
  ResponseFragment,
  ResponseLineFragment,
  ResponseRowFragment,
} from './operations.generated';

export const useResponseApi = () => {
  const keys = {
    base: () => ['response'] as const,
    detail: (id: string) => [...keys.base(), storeId, id] as const,
    list: () => [...keys.base(), storeId, 'list'] as const,
    paramList: (params: ListParams) => [...keys.list(), params] as const,
  };

  const { client } = useOmSupplyApi();
  const sdk = getSdk(client);
  const { storeId } = useAuthContext();
  const queries = getResponseQueries(sdk, storeId);

  return { ...queries, storeId, keys };
};

const useResponseNumber = () => {
  const { requisitionNumber = '' } = useParams();
  return requisitionNumber;
};

export const useUpdateResponse = () => {
  const queryClient = useQueryClient();
  const api = useResponseApi();
  return useMutation(api.update, {
    onSuccess: () => queryClient.invalidateQueries(api.keys.base()),
  });
};

export const useResponses = () => {
  const queryParams = useQueryParams<ResponseRowFragment>({
    initialSortBy: { key: 'otherPartyName' },
  });
  const api = useResponseApi();

  return {
    ...useQuery(api.keys.paramList(queryParams), () =>
      api.get.list({
        first: queryParams.first,
        offset: queryParams.offset,
        sortBy: queryParams.sortBy,
        filterBy: queryParams.filter.filterBy,
      })
    ),
    ...queryParams,
  };
};

export const useResponse = (): UseQueryResult<ResponseFragment> => {
  const responseNumber = useResponseNumber();
  const api = useResponseApi();
  return useQuery(api.keys.detail(responseNumber), () =>
    api.get.byNumber(responseNumber)
  );
};

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

interface UseResponseLinesController
  extends SortController<ResponseLineFragment> {
  lines: ResponseLineFragment[];
}

export const useResponseLines = (): UseResponseLinesController => {
  const { sortBy, onChangeSortBy } = useSortBy<ResponseLineFragment>({
    key: 'itemName',
    isDesc: false,
  });
  const { lines } = useResponseFields('lines');

  const sorted = useMemo(() => {
    return (lines?.nodes ?? []).sort(
      getDataSorter(sortBy.key as keyof ResponseLineFragment, !!sortBy.isDesc)
    );
  }, [sortBy, lines]);

  return { lines: sorted, sortBy, onChangeSortBy };
};

export const useIsResponseDisabled = (): boolean => {
  const { data } = useResponse();
  if (!data) return true;
  return isResponseDisabled(data);
};

export const useSaveResponseLines = () => {
  const responseNumber = useResponseNumber();
  const queryClient = useQueryClient();
  const api = useResponseApi();

  return useMutation(api.updateLine, {
    onSuccess: () =>
      queryClient.invalidateQueries(api.keys.detail(responseNumber)),
  });
};

export const useCreateOutboundFromResponse = () => {
  const { error, warning } = useNotification();
  const t = useTranslation('distribution');
  const openInNewTab = useOpenInNewTab();
  const { id } = useResponseFields('id');
  const api = useResponseApi();
  return useMutation(() => api.createOutboundFromResponse(id), {
    onSuccess: (invoiceNumber: number) => {
      openInNewTab(
        RouteBuilder.create(AppRoute.Distribution)
          .addPart(AppRoute.OutboundShipment)
          .addPart(String(invoiceNumber))
          .build()
      );
    },
    onError: e => {
      const errorObj = e as Error;
      if (errorObj.message === 'NothingRemainingToSupply') {
        warning(t('warning.nothing-to-supply'))();
      } else {
        error(t('error.failed-to-create-outbound'))();
      }
    },
  });
};
