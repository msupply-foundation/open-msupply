import { AppRoute } from '@openmsupply-client/config';
import { useMemo, useEffect } from 'react';
import {
  RouteBuilder,
  useOpenInNewTab,
  useQueryClient,
  useAuthContext,
  useParams,
  useGql,
  UseQueryResult,
  useQuery,
  FieldSelectorControl,
  useFieldsSelector,
  SortController,
  SortUtils,
  useQueryParams,
  useMutation,
  useNotification,
  useTranslation,
  Column,
  RegexUtils,
  useTableStore,
} from '@openmsupply-client/common';
import { getResponseQueries, ListParams } from './api';
import { useItemFilter } from '../../RequestRequisition/api';
import { isResponseDisabled } from './../../utils';
import {
  getSdk,
  ResponseFragment,
  ResponseLineFragment,
  ResponseRowFragment,
} from './operations.generated';
import { useResponseColumns } from '../DetailView/columns';

export const useResponseApi = () => {
  const keys = {
    base: () => ['response'] as const,
    detail: (id: string) => [...keys.base(), storeId, id] as const,
    list: () => [...keys.base(), storeId, 'list'] as const,
    paramList: (params: ListParams) => [...keys.list(), params] as const,
  };

  const { client } = useGql();
  const sdk = getSdk(client);
  const { storeId } = useAuthContext();
  const queries = getResponseQueries(sdk, storeId);

  return { ...queries, storeId, keys };
};

const useResponseNumber = () => {
  const { requisitionNumber = '' } = useParams();
  return requisitionNumber;
};

export const useIsRequestDisabled = (): boolean => {
  const { data } = useResponse();
  if (!data) return true;
  return isResponseDisabled(data);
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
  return useQuery(
    api.keys.detail(responseNumber),
    () => api.get.byNumber(responseNumber),
    // Don't refetch when the edit modal opens, for example. But, don't cache data when this query
    // is inactive. For example, when navigating away from the page and back again, refetch.
    {
      refetchOnMount: false,
      cacheTime: 0,
    }
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
  columns: Column<ResponseLineFragment>[];
  itemFilter: string;
  setItemFilter: (itemFilter: string) => void;
}

export const useResponseLines = (): UseResponseLinesController => {
  const { lines } = useResponseFields('lines');
  const { columns, onChangeSortBy, sortBy } = useResponseColumns();
  const { itemFilter, setItemFilter } = useItemFilter();

  useEffect(() => {
    setItemFilter('');
  }, []);

  const sorted = useMemo(() => {
    const currentColumn = columns.find(({ key }) => key === sortBy.key);
    const { getSortValue } = currentColumn ?? {};
    const sortedLines = getSortValue
      ? lines?.nodes.sort(
          SortUtils.getColumnSorter(getSortValue, !!sortBy.isDesc)
        )
      : lines?.nodes;
    return sortedLines.filter(({ item: { name } }) =>
      RegexUtils.matchSubstring(itemFilter, name)
    );
  }, [sortBy.key, sortBy.isDesc, lines, itemFilter]);

  return {
    lines: sorted,
    sortBy,
    onChangeSortBy,
    columns,
    itemFilter,
    setItemFilter,
  };
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
  const responseNumber = useResponseNumber();
  const queryClient = useQueryClient();
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
    onSettled: () => {
      queryClient.invalidateQueries(api.keys.detail(responseNumber));
    },
  });
};

export const useDeleteResponseLines = () => {
  const { success, info } = useNotification();
  const { lines } = useResponseLines();
  const api = useResponseApi();
  const requestNumber = useResponseNumber();
  const isDisabled = useIsRequestDisabled();
  const queryClient = useQueryClient();
  const { mutate } = useMutation(api.deleteLines, {
    onSettled: () =>
      queryClient.invalidateQueries(api.keys.detail(requestNumber)),
  });
  const t = useTranslation('distribution');

  const selectedRows = useTableStore(state =>
    lines.filter(({ id }) => state.rowState[id]?.isSelected)
  );

  const onDelete = async () => {
    if (isDisabled) {
      info(t('label.cant-delete-disabled-requisition'))();
      return;
    }
    info('Deleting response lines not yet implemented in API')();
    return;
    const number = selectedRows?.length;
    if (selectedRows && number) {
      mutate(selectedRows, {
        onSuccess: success(t('messages.deleted-lines', { number: number })),
      });
    } else {
      info(t('label.select-rows-to-delete-them'))();
    }
  };

  return { onDelete };
};

export const useSupplyRequestedQuantity = () => {
  const responseNumber = useResponseNumber();
  const queryClient = useQueryClient();
  const { id } = useResponseFields('id');
  const api = useResponseApi();

  return useMutation(() => api.supplyRequestedQuantity(id), {
    onSettled: () => {
      queryClient.invalidateQueries(api.keys.detail(responseNumber));
    },
  });
};
