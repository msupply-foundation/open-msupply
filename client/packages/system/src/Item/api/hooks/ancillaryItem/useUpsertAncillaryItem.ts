import { useState } from 'react';
import {
  FnUtils,
  isEmpty,
  LocaleKey,
  TypedTFunction,
  useMutation,
  useTranslation,
} from '@openmsupply-client/common';
import {
  AncillaryItemFragment,
  UpsertAncillaryItemMutation,
} from '../../operations.generated';
import { useItemApi, useItemGraphQL } from '../useItemApi';

type UpsertAncillaryItemError = Extract<
  UpsertAncillaryItemMutation['centralServer']['ancillaryItem']['upsertAncillaryItem'],
  { __typename: 'UpsertAncillaryItemError' }
>['error'];

function translateError(
  error: UpsertAncillaryItemError,
  t: TypedTFunction<LocaleKey>
): string {
  switch (error.__typename) {
    case 'DuplicateAncillaryItem':
      return t('error.duplicate-ancillary-item');
    case 'AncillaryCycleDetected':
      return t('error.ancillary-cycle-detected');
    case 'AncillaryMaxDepthExceeded':
      return t('error.ancillary-max-depth-exceeded', {
        max: error.max,
        actual: error.actual,
      });
    default:
      // InternalError / DatabaseError — surface server description, not translated
      return error.description;
  }
}

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
          itemId: principalItemId,
          ancillaryItemId: draft.ancillaryItemId,
          itemQuantity: draft.itemQuantity,
          ancillaryQuantity: draft.ancillaryQuantity,
        },
      });
      if (isEmpty(apiResult)) {
        // permission denied or similar — surfaced upstream by the error toast
        throw new Error();
      }
      const result = apiResult.centralServer.ancillaryItem.upsertAncillaryItem;
      if (result.__typename === 'AncillaryItemNode') {
        return result;
      }
      throw new Error(translateError(result.error, t));
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
    resetDraft: () =>
      setDraft({
        ancillaryItemId: null,
        itemQuantity: 1,
        ancillaryQuantity: 1,
      }),
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
