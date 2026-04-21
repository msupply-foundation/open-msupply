import { useState } from 'react';
import {
  FnUtils,
  isEmpty,
  useMutation,
  useTranslation,
} from '@openmsupply-client/common';
import { AncillaryItemFragment } from '../../operations.generated';
import { useItemApi, useItemGraphQL } from '../useItemApi';

export type DraftAncillaryItem = {
  ancillaryItemId: string | null;
  /** Left-hand side of the x:y ratio (principal count). */
  itemQuantity: number;
  /** Right-hand side of the x:y ratio (ancillary count). */
  ancillaryQuantity: number;
};

export function useUpsertAncillaryItem({
  principalItemId,
  existing,
}: {
  principalItemId: string;
  existing: AncillaryItemFragment | null;
}) {
  const { api, storeId, queryClient } = useItemGraphQL();
  const { keys } = useItemApi();
  const t = useTranslation();

  const [draft, setDraft] = useState<DraftAncillaryItem>({
    ancillaryItemId: existing?.ancillaryItem?.id ?? null,
    itemQuantity: existing?.itemQuantity ?? 1,
    ancillaryQuantity: existing?.ancillaryQuantity ?? 1,
  });

  const { mutateAsync } = useMutation({
    mutationFn: async () => {
      if (!draft.ancillaryItemId) return;

      const apiResult = await api.upsertAncillaryItem({
        storeId,
        input: {
          id: existing?.id ?? FnUtils.generateUUID(),
          itemLinkId: principalItemId,
          ancillaryItemLinkId: draft.ancillaryItemId,
          itemQuantity: draft.itemQuantity,
          ancillaryQuantity: draft.ancillaryQuantity,
        },
      });
      // empty when permission denied or similar generic error
      if (!isEmpty(apiResult)) {
        const result =
          apiResult.centralServer.ancillaryItem.upsertAncillaryItem;
        if (result.__typename === 'AncillaryItemNode') {
          return result;
        }
      }
      throw new Error(t('error.failed-to-save-ancillary-item'));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(keys.detail(principalItemId));
    },
  });

  return {
    draft,
    isComplete: isComplete(draft, principalItemId),
    updateDraft: (update: Partial<DraftAncillaryItem>) =>
      setDraft(currentDraft => ({ ...currentDraft, ...update })),
    save: mutateAsync,
  };
}

function isComplete(draft: DraftAncillaryItem, principalItemId: string) {
  return (
    draft.itemQuantity > 0 &&
    draft.ancillaryQuantity > 0 &&
    !!draft.ancillaryItemId &&
    draft.ancillaryItemId !== principalItemId
  );
}
