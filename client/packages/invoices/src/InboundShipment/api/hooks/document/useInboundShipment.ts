import {
  RecordPatch,
  UpdateInboundShipmentInput,
  useMutation,
  useQuery,
  usePatchState,
} from '@openmsupply-client/common';
import { useInboundId } from '../utils/useInboundId';
import {
  InboundFragment,
  InboundRowFragment,
  InsertInboundShipmentMutationVariables,
} from '../../operations.generated';
import { useInboundGraphQL } from '../../useInboundGraphQL';
import { INBOUND, INBOUND_LINE } from './keys';
import { isInboundDisabled } from '@openmsupply-client/invoices/src/utils';
import { inboundParsers } from '../../api';
import { useInboundDelete } from './useInboundDelete';
import { useMemo } from 'react';

export const useInboundShipment = (id?: string) => {
  const paramInvoiceId = useInboundId();

  // If an id is passed in, use that. Otherwise use the invoice id from the URL
  const invoiceId = !id ? paramInvoiceId : id;

  const { data, isLoading: loading, error } = useGetById(invoiceId);
  const { queryClient } = useInboundGraphQL();

  const isDisabled = data ? isInboundDisabled(data) : false;

  const rows = useMemo(() => {
    const lines = data?.lines?.nodes ?? [];
    return lines;
  }, [data]);

  // UPDATE
  const { patch, updatePatch, resetDraft, isDirty } =
    usePatchState<InboundFragment>(data ?? {});

  const {
    mutateAsync: updateMutation,
    isLoading: isUpdating,
    error: updateError,
  } = useUpdate();

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
    isDisabled,
    update: { update, isUpdating, updateError },
    create: { create, isCreating, createError },
    delete: { deleteInbound, isDeleting, deleteError },
    isDirty,
    updatePatch,
    rows,
    invalidateQuery,
  };
};

const useGetById = (invoiceId: string | undefined) => {
  const { inboundApi, storeId } = useInboundGraphQL();

  const queryFn = async (): Promise<InboundFragment> => {
    const result = await inboundApi.invoice({
      id: invoiceId ?? '',
      storeId,
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

const useUpdate = () => {
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
    // The parser handles all types including specialized fields like defaultDonorUpdate
    const input: UpdateInboundShipmentInput = inboundParsers.toUpdate(patch);
    const result = await inboundApi.updateInboundShipment({
      input,
      storeId,
    });

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
    const result =
      (await inboundApi.insertInboundShipment({
        ...input,
        storeId,
      })) || {};

    const { insertInboundShipment } = result;

    if (insertInboundShipment?.__typename === 'InvoiceNode') {
      return insertInboundShipment.id;
    }

    throw new Error(
      insertInboundShipment?.error?.description || 'Could not create invoice'
    );
  };

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries([INBOUND]),
  });
};
