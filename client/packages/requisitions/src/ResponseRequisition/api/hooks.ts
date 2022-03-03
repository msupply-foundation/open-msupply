import { AppRoute } from '@openmsupply-client/config';
import { useMemo } from 'react';
import {
  RouteBuilder,
  useNavigate,
  useQueryClient,
  useAuthContext,
  RequisitionNodeStatus,
  useParams,
  useOmSupplyApi,
  UseQueryResult,
  useQuery,
  FieldSelectorControl,
  useFieldsSelector,
  SortController,
  PaginationState,
  useSortBy,
  usePagination,
  getDataSorter,
  useQueryParams,
  useMutation,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import { getResponseQueries } from './api';
import {
  getSdk,
  ResponseFragment,
  ResponseLineFragment,
  ResponseRowFragment,
} from './operations.generated';

export const useResponseApi = () => {
  const { client } = useOmSupplyApi();
  const sdk = getSdk(client);
  const { storeId } = useAuthContext();
  const queries = getResponseQueries(sdk, storeId);

  return { ...queries, storeId };
};

export const useUpdateResponse = () => {
  const queryClient = useQueryClient();
  const api = useResponseApi();
  return useMutation(api.update, {
    onSuccess: () => queryClient.invalidateQueries(['requisition']),
  });
};

export const useResponses = () => {
  const queryParams = useQueryParams<ResponseRowFragment>({
    initialSortBy: { key: 'otherPartyName' },
  });
  const api = useResponseApi();

  return {
    ...useQuery(['requisition', api.storeId, queryParams], () =>
      api.get.list({
        first: queryParams.first,
        offset: queryParams.offset,
        sortBy: queryParams.sortBy,
        filter: queryParams.filter.filterBy,
      })
    ),
    ...queryParams,
  };
};

export const useResponse = (): UseQueryResult<ResponseFragment> => {
  const { requisitionNumber = '' } = useParams();
  const api = useResponseApi();
  return useQuery(['requisition', api.storeId, requisitionNumber], () =>
    api.get.byNumber(requisitionNumber)
  );
};

export const useResponseFields = <
  KeyOfRequisition extends keyof ResponseFragment
>(
  keys: KeyOfRequisition | KeyOfRequisition[]
): FieldSelectorControl<ResponseFragment, KeyOfRequisition> => {
  const { data } = useResponse();
  const { requisitionNumber = '' } = useParams();
  const api = useResponseApi();
  return useFieldsSelector(
    ['requisition', api.storeId, requisitionNumber],
    () => api.get.byNumber(requisitionNumber),
    (patch: Partial<ResponseFragment>) =>
      api.update({ ...patch, id: data?.id ?? '' }),
    keys
  );
};

interface UseResponseLinesController
  extends SortController<ResponseLineFragment>,
    PaginationState {
  lines: ResponseLineFragment[];
}

export const useResponseLines = (): UseResponseLinesController => {
  const { sortBy, onChangeSortBy } = useSortBy<ResponseLineFragment>({
    key: 'itemName',
    isDesc: false,
  });
  const pagination = usePagination(20);
  const { lines } = useResponseFields('lines');

  const sorted = useMemo(() => {
    const sorted = [...(lines.nodes ?? [])].sort(
      getDataSorter(sortBy.key as keyof ResponseLineFragment, !!sortBy.isDesc)
    );

    return sorted.slice(
      pagination.offset,
      pagination.first + pagination.offset
    );
  }, [sortBy, lines, pagination]);

  return { lines: sorted, sortBy, onChangeSortBy, ...pagination };
};

export const useIsResponseDisabled = (): boolean => {
  const { status } = useResponseFields('status');
  return status === RequisitionNodeStatus.Finalised;
};

export const useSaveResponseLines = () => {
  const { requisitionNumber = '' } = useParams();
  const queryClient = useQueryClient();
  const api = useResponseApi();

  return useMutation(api.updateLine, {
    onSuccess: () =>
      queryClient.invalidateQueries([
        'requisition',
        api.storeId,
        requisitionNumber,
      ]),
  });
};

const useOpenInNewTab = () => {
  const navigate = useNavigate();
  const { origin } = window.location;
  return (url: string) => {
    const to = `${origin}${url}`;
    console.log(origin);
    console.log(to);
    const win = window.open(to, '_blank');
    if (win) {
      win.focus();
    } else {
      navigate(to);
    }
  };
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
      console.log(errorObj);
      if (errorObj.message === 'NothingRemainingToSupply') {
        warning(t('warning.nothing-to-supply'))();
      } else {
        error(t('error.failed-to-create-outbound'))();
      }
    },
  });
};
