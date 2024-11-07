import { useState } from 'react';
import {
  FnUtils,
  isEmpty,
  useMutation,
  useTranslation,
} from '@openmsupply-client/common';
import {
  BundledItemFragment,
  ItemVariantFragment,
} from '../../operations.generated';
import { useItemApi, useItemGraphQL } from '../useItemApi';

export type DraftBundle = {
  itemId: string | null;
  variantId: string | null;
  ratio: number;
};

export function useUpsertBundledItem({
  principalVariant,
  bundle,
}: {
  principalVariant: ItemVariantFragment;
  bundle: BundledItemFragment | null;
}) {
  const { api, storeId, queryClient } = useItemGraphQL();
  const { keys } = useItemApi();
  const t = useTranslation();

  const [draft, setDraft] = useState<DraftBundle>({
    itemId: bundle?.bundledItemVariant?.itemId ?? null,
    variantId: bundle?.bundledItemVariant?.id ?? null,
    ratio: bundle?.ratio ?? 1,
  });

  const { mutateAsync } = useMutation({
    mutationFn: async () => {
      if (!draft.variantId) {
        return;
      }

      const apiResult = await api.upsertBundledItem({
        storeId,
        input: {
          id: bundle?.id ?? FnUtils.generateUUID(),
          principalItemVariantId: principalVariant.id,
          bundledItemVariantId: draft.variantId,
          ratio: draft.ratio,
        },
      });
      // will be empty if there's a generic error, such as permission denied
      if (!isEmpty(apiResult)) {
        const result = apiResult.centralServer.bundledItem.upsertBundledItem;
        if (result.__typename === 'BundledItemNode') {
          return result;
        }
      }
      throw new Error(t('error.failed-to-save-bundled-item'));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(keys.detail(principalVariant.itemId));
    },
  });

  return {
    draft,
    isComplete: getIsComplete(draft),
    updateDraft: (update: Partial<DraftBundle>) =>
      setDraft(currentDraft => ({ ...currentDraft, ...update })),

    save: mutateAsync,
  };
}

function getIsComplete(draft: DraftBundle) {
  return !!draft.ratio && !!draft.variantId;
}
