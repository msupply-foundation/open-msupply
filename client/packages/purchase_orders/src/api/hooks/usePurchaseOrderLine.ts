import {   useIntlUtils, useMutation, usePatchState, useQuery, useTranslation } from "@openmsupply-client/common/src";
import { usePurchaseOrderGraphQL } from "../usePurchaseOrderGraphQL";
import { LIST, PURCHASE_ORDER, PURCHASE_ORDER_LINE } from "./keys";
import { PurchaseOrderLineFragment } from "../operations.generated";

export type DraftPurchaseOrderLine = Omit<
  PurchaseOrderLineFragment,
  "__typename"| "item"> & {
  purchaseOrderId: string;
  itemId: string;
  requestedPackSize: number | undefined;
  requestedNumberOfUnits: number | undefined;
  }

  export type DraftPurchaseOrderLineFromCSV = Omit<
  DraftPurchaseOrderLine,
  "id" | "itemId"> & {
    itemCode: string;
  }



const defaultPurchaseOrderLine: DraftPurchaseOrderLine = {
    id: "",
    purchaseOrderId: "",
    itemId: "",
    requestedPackSize: 0,
    requestedNumberOfUnits: 0,
};



export function usePurchaseOrderLine(id?: string) {

 const { data, isLoading, error } = useGet(id ?? '');


 // CREATE
  const {
    mutateAsync: createMutation,
    isLoading: isCreating,
    error: createError,
  } = useCreate();



    const { patch, updatePatch, resetDraft, isDirty } =
      usePatchState<DraftPurchaseOrderLine>(data?.nodes[0] ?? {});

    const draft: DraftPurchaseOrderLine = data
      ? { ...defaultPurchaseOrderLine, ...data?.nodes[0], ...patch }
      : { ...defaultPurchaseOrderLine, ...patch };
    const create = async () => {
      const result = await createMutation(draft);
      resetDraft();
      return result;
    };

    // CREATE FROM CSV

  const {
    mutateAsync,
    invalidateQueries,
  } = useLineInsertFromCSV();


    return {
    query: { data: data?.nodes[0], isLoading, error },
    create: { create, isCreating, createError },
    createFromCSV: {mutateAsync, invalidateQueries},
    draft,
    resetDraft,
    isDirty,
    updatePatch,
  };
}


const useGet = (id: string) => {
  const { purchaseOrderApi, storeId } = usePurchaseOrderGraphQL();

  const queryFn = async () => {
    const result = await purchaseOrderApi.purchaseOrderLine({
      id,
      storeId,
    });

    if (result.purchaseOrderLines.__typename === 'PurchaseOrderLineConnector') {
      return result.purchaseOrderLines;
    }
  };

  const query = useQuery({
    queryKey: [PURCHASE_ORDER_LINE, id],
    queryFn,
    enabled: id !== '',
  });

  return query;
};

const useCreate = () => {
  const { purchaseOrderApi, storeId, queryClient } = usePurchaseOrderGraphQL();

  const mutationFn = async ({
    purchaseOrderId,
    itemId,
    id,
  }: DraftPurchaseOrderLine) => {
    return await purchaseOrderApi.insertPurchaseOrderLine({
      storeId,
      input: {
        id,
        // TODO better way of handling non item id
        itemId: itemId,
        purchaseOrderId,
      },
    });
  };

  return useMutation({
    mutationFn,
    onSuccess: () =>
      queryClient.invalidateQueries([LIST, PURCHASE_ORDER, storeId]),
  });
};



export const useLineInsertFromCSV = () => {
    const { purchaseOrderApi, storeId, queryClient } = usePurchaseOrderGraphQL();
    const  t = useTranslation();
    const {isLocaleKey} = useIntlUtils();

  const { mutateAsync } = useMutation(async (line: Partial<DraftPurchaseOrderLineFromCSV>) => {
    const result = await purchaseOrderApi.insertPurchaseOrderLineFromCSV({
    storeId,
    input:  {
      itemCode: line.itemCode ?? "",
      purchaseOrderId: line.purchaseOrderId ?? "",
      requestedPackSize: line.requestedPackSize ?? 0.0,
      requestedNumberOfUnits: line.requestedNumberOfUnits ?? 0,
    },
    });
    if (result.insertPurchaseOrderLineFromCsv.__typename === 'IdResponse') {
      return result.insertPurchaseOrderLineFromCsv.id;
    } 

    const error = result.insertPurchaseOrderLineFromCsv.error.description;
    const errorMessage = isLocaleKey(error) ? t(error) : error;

    throw new Error(errorMessage);
  });

  return {
  mutateAsync,
  invalidateQueries: () => queryClient.invalidateQueries([LIST, PURCHASE_ORDER, storeId]),
  };

}



