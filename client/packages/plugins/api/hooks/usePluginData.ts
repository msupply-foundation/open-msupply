import {
  PluginDataFilterInput,
  useMutation,
  useQuery,
} from '@openmsupply-client/common';
import { usePluginDataGraphQL } from '../usePluginGraphQL';
import { useState } from 'react';
import { RepackDraft } from '../../types';
import { PLUGIN_DATA } from './keys';

type UseRepackProps = { pluginCode: string; filter?: PluginDataFilterInput };

export const usePluginData = ({ pluginCode, filter }: UseRepackProps) => {
  const { pluginDataApi, storeId, queryClient } = usePluginDataGraphQL();
  // const [draft, setDraft] = useState<RepackDraft>({
  //   stockLineId: stockLineId ?? '',
  //   packSize: 0,
  //   newPackSize: 0,
  //   numberOfPacks: 0,
  // });

  // Fetch pluginData rows matching filter
  const queryListFn = async () => {
    const result = await pluginDataApi.pluginData({
      pluginCode,
      storeId,
      filter,
    });

    return result.pluginData;
  };

  const { data, isError, isLoading } = useQuery({
    queryKey: [PLUGIN_DATA, storeId, 'stockLineId'],
    queryFn: queryListFn,
    // enabled: !!'stockLineId',
  });

  // FETCH SINGLE
  // const queryFn = async () => {
  //   const result = await stockApi.repack({
  //     storeId,
  //     invoiceId: invoiceId ?? '',
  //   });

  //   if (result.repack.__typename === 'RepackNode') {
  //     return result.repack;
  //   }
  // };

  // const { data, isError, isLoading } = useQuery({
  //   queryKey: [STOCK, invoiceId],
  //   queryFn,
  //   enabled: !!invoiceId,
  // });

  // UPDATE DRAFT
  // const onChange = (patch: Partial<RepackDraft>) => {
  //   setDraft({ ...draft, ...patch });
  // };

  // INSERT NEW
  // const mutationFn = async () => {
  //   const result = await stockApi.insertRepack({
  //     storeId,
  //     input: {
  //       stockLineId: draft.stockLineId,
  //       newPackSize: draft.newPackSize,
  //       numberOfPacks: draft.numberOfPacks,
  //       newLocationId: draft.newLocationId ?? undefined,
  //     },
  //   });

  //   return result.insertRepack;
  // };

  // const mutation = useMutation({
  //   mutationFn,
  //   onSuccess: () => {
  //     // Need to force the following to be re-fetched:
  //     // - Repack list
  //     // - Stockline quantity
  //     // - Ledger
  //     queryClient.invalidateQueries([STOCK_LINE]);
  //     queryClient.invalidateQueries([STOCK, invoiceId]);
  //     onChange({
  //       packSize: 0,
  //       newPackSize: 0,
  //       numberOfPacks: 0,
  //     });
  //   },
  // });

  return {
    // Fetch
    query: {
      data: data?.nodes,
      isError,
      isLoading,
    },
    // Update draft
    // draft,
    // onChange,
    // Create
    // onInsert: mutation.mutateAsync,
  };
};
