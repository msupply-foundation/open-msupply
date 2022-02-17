import { useMemo } from 'react';
import {
  useQueryClient,
  RequisitionNodeStatus,
  useNavigate,
  useMutation,
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
} from '@openmsupply-client/common';
import { RequestRequisitionQueries } from './api';
import {
  getSdk,
  RequestRequisitionFragment,
  RequestRequisitionLineFragment,
} from './operations.generated';

export const useRequestRequisitionApi = () => {
  const { client } = useOmSupplyApi();
  return getSdk(client);
};

export const useRequestRequisitions = () => {
  const api = useRequestRequisitionApi();
  return useQuery(['requisition'], RequestRequisitionQueries.get.list(api));
};

export const useCreateRequestRequisition = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const api = useRequestRequisitionApi();
  return useMutation(RequestRequisitionQueries.create(api), {
    onSuccess: ({ id }) => {
      navigate(id);
      queryClient.invalidateQueries(['requisition']);
    },
  });
};

export const useRequestRequisition =
  (): UseQueryResult<RequestRequisitionFragment> => {
    const { id = '' } = useParams();
    const api = useRequestRequisitionApi();
    return useQuery(['requisition', id], () =>
      RequestRequisitionQueries.get.byNumber(api)()
    );
  };

export const useRequestRequisitionFields = <
  KeyOfRequisition extends keyof RequestRequisitionFragment
>(
  keys: KeyOfRequisition | KeyOfRequisition[]
): FieldSelectorControl<RequestRequisitionFragment, KeyOfRequisition> => {
  const { id = '' } = useParams();
  const api = useRequestRequisitionApi();
  return useFieldsSelector(
    ['requisition', id],
    () => RequestRequisitionQueries.get.byNumber(api)(),
    (patch: Partial<RequestRequisitionFragment>) =>
      RequestRequisitionQueries.update(api)({ ...patch, id }),
    keys
  );
};

interface UseRequestRequisitionLinesController
  extends SortController<RequestRequisitionLineFragment>,
    PaginationState {
  lines: RequestRequisitionLineFragment[];
}

export const useRequestRequisitionLines =
  (): UseRequestRequisitionLinesController => {
    const { sortBy, onChangeSortBy } =
      useSortBy<RequestRequisitionLineFragment>({
        key: 'itemName',
        isDesc: false,
      });
    const pagination = usePagination(20);
    const { lines } = useRequestRequisitionFields('lines');

    const sorted = useMemo(() => {
      const sorted =
        lines?.nodes.sort(
          getDataSorter(
            sortBy.key as keyof RequestRequisitionLineFragment,
            !!sortBy.isDesc
          )
        ) ?? [];

      return sorted.slice(
        pagination.offset,
        pagination.first + pagination.offset
      );
    }, [sortBy, lines, pagination]);

    return { lines: sorted, sortBy, onChangeSortBy, ...pagination };
  };

export const useIsRequestRequisitionDisabled = (): boolean => {
  const { status } = useRequestRequisitionFields('status');
  return status === RequisitionNodeStatus.Finalised;
};
