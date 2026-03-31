import {
  RecordPatch,
  UpdateInboundShipmentInput,
  InvoiceTypeInput,
  useMutation,
  useQuery,
  usePatchState,
  useParams,
  useAuthContext,
  useLocation,
  UserPermission,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import {
  InboundFragment,
  InboundRowFragment,
  InsertInboundShipmentMutationVariables,
} from '../../operations.generated';
import { useInboundGraphQL } from '../../useInboundGraphQL';
import { INBOUND, INBOUND_LINE } from './keys';
import {
  isInboundDisabled,
  isInboundHoldable,
  isInboundStatusChangeDisabled,
} from '@openmsupply-client/invoices/src/utils';
import { inboundParsers } from '../../api';
import { useInboundDelete } from './useInboundDelete';
import { useCallback, useMemo } from 'react';

export const useInboundShipment = (id?: string) => {
  const { invoiceId: paramInvoiceId = '' } = useParams();
  const location = useLocation();
  const isExternal = location.pathname.includes(
    AppRoute.InboundShipmentExternal
  );

  // If an id is passed in, use that. Otherwise use the invoice id from the URL
  const invoiceId = !id ? paramInvoiceId : id;

  const invoiceType = isExternal
    ? InvoiceTypeInput.InboundShipmentExternal
    : InvoiceTypeInput.InboundShipment;

  const { data, isLoading: loading, error } = useGetById(invoiceId, invoiceType);
  const { queryClient } = useInboundGraphQL();
  const { userHasPermission } = useAuthContext();
  const isHoldable = isInboundHoldable(data);
  const hasMutatePermission = isExternal
    ? userHasPermission(UserPermission.InboundShipmentExternalMutate)
    : userHasPermission(UserPermission.InboundShipmentMutate);
  const hasVerifyPermission = isExternal
    ? userHasPermission(UserPermission.InboundShipmentExternalAuthorise)
    : userHasPermission(UserPermission.InboundShipmentVerify);
  const isDisabled = isInboundDisabled(data) || !hasMutatePermission;
  const isStatusChangeDisabled = isInboundStatusChangeDisabled(data);

  const rows = useMemo(() => {
    const lines = data?.lines?.nodes ?? [];
    return lines;
  }, [data]);

  // UPDATE
  const { patch, patchRef, updatePatch, resetDraft, isDirty } =
    usePatchState<InboundFragment>(data ?? {});

  const {
    mutateAsync: updateMutation,
    isLoading: isUpdating,
    error: updateError,
  } = useUpdate(isExternal);

  const update = async (
    newData?:
      | Partial<InboundFragment | InboundRowFragment>
      | {
          id: string;
          defaultDonorUpdate: UpdateInboundShipmentInput['defaultDonor'];
        }
  ) => {
    if (!data?.id) return;
    // Data can be passed directly to the update method, or if omitted will use
    // the current patch data
    if (newData) await updateMutation({ ...newData, id: data.id });
    else await updateMutation({ ...patch, id: data.id });
    resetDraft();
  };

  // Save using the ref so we always have the latest pending changes,
  // regardless of React's render cycle. Don't resetDraft here — the
  // mutation triggers a refetch via invalidateQueries, and clearing the
  // patch before the refetch completes would briefly revert the UI to
  // stale query data. The patch values become harmless once the refetch
  // lands (they'll match the new data, so isDirty becomes false).
  const saveDraft = useCallback(async () => {
    if (!data?.id) return;
    const changes = patchRef.current;
    if (Object.keys(changes).length === 0) return;
    const hasChanges = Object.entries(changes).some(
      ([key, value]) => data[key as keyof InboundFragment] !== value
    );
    if (!hasChanges) return;
    patchRef.current = {};
    await updateMutation({ ...changes, id: data.id });
  }, [data, patchRef, updateMutation]);

  const draft = useMemo(
    () => (data ? { ...data, ...patch } : data),
    [data, patch]
  );

  // CREATE
  const {
    mutateAsync: createMutation,
    isLoading: isCreating,
    error: createError,
  } = useCreate();

  const create = async (
    input: Omit<InsertInboundShipmentMutationVariables, 'storeId'>
  ) => {
    const result = await createMutation(input);
    resetDraft();
    return result;
  };

  // DELETE
  const {
    mutateAsync: deleteMutation,
    isLoading: isDeleting,
    error: deleteError,
  } = useInboundDelete();

  const deleteInbound = async () => {
    if (!data) return;
    const result = await deleteMutation([data]);
    resetDraft();
    return result;
  };

  const invalidateQuery = () => {
    queryClient.invalidateQueries([INBOUND, INBOUND_LINE, invoiceId]);
  };

  return {
    query: { data, loading, error },
    draft,
    isExternal,
    isDisabled,
    hasMutatePermission,
    isHoldable,
    isStatusChangeDisabled,
    hasVerifyPermission,
    update: { update, saveDraft, isUpdating, updateError },
    create: { create, isCreating, createError },
    delete: { deleteInbound, isDeleting, deleteError },
    isDirty,
    updatePatch,
    rows,
    invalidateQuery,
  };
};

const useGetById = (
  invoiceId: string | undefined,
  type?: InvoiceTypeInput
) => {
  const { inboundApi, storeId } = useInboundGraphQL();

  const queryFn = async (): Promise<InboundFragment> => {
    const result = await inboundApi.invoice({
      id: invoiceId ?? '',
      storeId,
      type,
    });

    const invoice = result?.invoice;

    if (invoice?.__typename === 'InvoiceNode') {
      return invoice;
    } else {
      console.error('No invoice found', invoiceId);
      throw new Error(`Could not find invoice ${invoiceId}`);
    }
  };

  const query = useQuery({
    queryKey: [INBOUND, INBOUND_LINE, invoiceId],
    queryFn,
    enabled: !!invoiceId,
    // Don't refetch when the edit modal opens, for example. But, don't cache data when this query
    // is inactive. For example, when navigating away from the page and back again, refetch.
    refetchOnMount: false,
    cacheTime: 0,
  });

  return query;
};

const useUpdate = (isExternal: boolean) => {
  const { inboundApi, storeId, queryClient } = useInboundGraphQL();

  const mutationFn = async (
    patch:
      | RecordPatch<InboundFragment>
      | RecordPatch<InboundRowFragment>
      | {
          id: string;
          defaultDonorUpdate: UpdateInboundShipmentInput['defaultDonor'];
        }
  ) => {
    const input: UpdateInboundShipmentInput = inboundParsers.toUpdate(patch);
    const variables = { input, storeId };

    const result = isExternal
      ? await inboundApi.updateInboundShipmentExternal(variables)
      : await inboundApi.updateInboundShipment(variables);

    return result;
  };

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries([INBOUND]);
    },
  });
};

const useCreate = () => {
  const { inboundApi, storeId, queryClient } = useInboundGraphQL();

  const mutationFn = async (
    input: Omit<InsertInboundShipmentMutationVariables, 'storeId'>
  ): Promise<string> => {
    const isExternal = !!input.purchaseOrderId;
    const variables = { ...input, storeId };

    const insertResult = isExternal
      ? (await inboundApi.insertInboundShipmentExternal(variables))
          ?.insertInboundShipmentExternal
      : (await inboundApi.insertInboundShipment(variables))
          ?.insertInboundShipment;

    if (insertResult?.__typename === 'InvoiceNode') {
      return insertResult.id;
    }

    throw new Error(
      (insertResult as any)?.error?.description || 'Could not create invoice'
    );
  };

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries([INBOUND]),
  });
};
