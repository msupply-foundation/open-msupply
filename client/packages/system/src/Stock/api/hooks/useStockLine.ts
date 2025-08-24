import {
  FnUtils,
  setNullableInput,
  useMutation,
  usePatchState,
  useQuery,
} from '@openmsupply-client/common';
import {
  LOCATION,
  ReasonOptionRowFragment,
  StockLineRowFragment,
} from '../../..';
import { STOCK_LINE } from './keys';
import { useStockGraphQL } from '../useStockGraphQL';

export interface DraftStockLine extends StockLineRowFragment {
  reasonOption: ReasonOptionRowFragment | null;
}

const defaultDraftStockLine: DraftStockLine = {
  __typename: 'StockLineNode',
  id: '',
  itemId: '',
  onHold: false,
  packSize: 0,
  sellPricePerPack: 0,
  costPricePerPack: 0,
  totalNumberOfPacks: 0,
  availableNumberOfPacks: 0,
  storeId: '',
  item: {
    __typename: 'ItemNode',
    code: '',
    name: '',
    isVaccine: false,
    dosesPerUnit: 0,
  },
  reasonOption: null,
  vvmStatusLogs: {
    __typename: 'VvmstatusLogConnector',
    nodes: [],
  },
  vvmStatus: null,
  campaign: null,
  program: null,
  volumePerPack: 0,
  itemVariant: null,
  totalVolume: 0,
};

export function useStockLine(id?: string) {
  const { data, isLoading, error } = useGet(id ?? '');
  const {
    mutateAsync: createMutation,
    isLoading: isCreating,
    error: createError,
  } = useCreate();
  const {
    mutateAsync: updateMutation,
    isLoading: isUpdating,
    error: updateError,
  } = useUpdate(id ?? '');

  const { patch, updatePatch, resetDraft, isDirty } =
    usePatchState<DraftStockLine>(data?.nodes[0] ?? {});

  const draft: DraftStockLine = data
    ? { ...defaultDraftStockLine, ...data?.nodes[0], ...patch }
    : { ...defaultDraftStockLine, ...patch };

  const create = async () => {
    const result = await createMutation(draft);
    resetDraft();
    return result;
  };
  const update = async () => {
    await updateMutation(patch);
    resetDraft();
  };

  return {
    query: { data: data?.nodes[0], isLoading, error },
    create: { create, isCreating, createError },
    update: { update, isUpdating, updateError },
    draft,
    resetDraft,
    isDirty,
    updatePatch,
  };
}

const useGet = (id: string) => {
  const { stockApi, storeId } = useStockGraphQL();

  const queryFn = async () => {
    const result = await stockApi.stockLine({
      id,
      storeId,
    });

    if (result.stockLines.__typename === 'StockLineConnector') {
      return result.stockLines;
    }
  };

  const query = useQuery({
    queryKey: [STOCK_LINE, id],
    queryFn,
    enabled: id !== '',
  });

  return query;
};

const useCreate = () => {
  const { stockApi, storeId, queryClient } = useStockGraphQL();

  const mutationFn = async ({
    itemId,
    reasonOption,
    packSize,
    totalNumberOfPacks,
    barcode,
    batch,
    expiryDate,
    sellPricePerPack,
    costPricePerPack,
    location,
    onHold,
    itemVariant,
    donor,
    campaign,
    program,
    vvmStatus,
    volumePerPack,
  }: DraftStockLine) => {
    return await stockApi.insertStockLine({
      storeId,
      input: {
        id: FnUtils.generateUUID(),
        itemId,
        packSize,
        barcode,
        batch,
        expiryDate,
        sellPricePerPack,
        costPricePerPack,
        onHold,
        numberOfPacks: totalNumberOfPacks,
        location: setNullableInput('id', location),
        reasonOptionId: reasonOption?.id,
        itemVariantId: itemVariant?.id,
        vvmStatusId: vvmStatus?.id,
        donorId: donor?.id,
        campaignId: campaign?.id,
        programId: program?.id,
        volumePerPack: volumePerPack,
      },
    });
  };

  return useMutation({
    mutationFn,
    onSuccess: () =>
      // Stock line list needs to be re-fetched to include the new stock line
      queryClient.invalidateQueries([STOCK_LINE]),
  });
};

const useUpdate = (id: string) => {
  const { stockApi, storeId, queryClient } = useStockGraphQL();

  const mutationFn = async ({
    barcode,
    batch,
    expiryDate,
    sellPricePerPack,
    costPricePerPack,
    onHold,
    location,
    vvmStatusId,
    itemVariant,
    donor,
    campaign,
    program,
    volumePerPack,
  }: Partial<DraftStockLine>) => {
    const result = await stockApi.updateStockLine({
      input: {
        id,
        barcode,
        batch,
        costPricePerPack,
        expiryDate: setNullableInput('expiryDate', { expiryDate }),
        onHold,
        sellPricePerPack,
        location: setNullableInput('id', location),
        itemVariantId: setNullableInput('id', itemVariant),
        vvmStatusId,
        donorId: setNullableInput('id', donor),
        campaignId: setNullableInput('id', campaign),
        programId: setNullableInput('id', program),
        volumePerPack,
      },
      storeId,
    });

    const { updateStockLine } = result;

    if (updateStockLine?.__typename === 'StockLineNode') {
      return updateStockLine;
    }

    throw new Error('Unable to update stock line');
  };

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries([STOCK_LINE, id]);
      queryClient.invalidateQueries([LOCATION]); // Invalidate location queries to update available volume
    },
  });
};
