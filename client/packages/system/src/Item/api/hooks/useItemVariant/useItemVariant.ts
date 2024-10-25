import { useEffect, useRef, useState } from 'react';
import {
  FnUtils,
  isEmpty,
  useMutation,
  useTranslation,
} from '@openmsupply-client/common';
import { ItemVariantFragment } from '../../operations.generated';
import { useItemApi, useItemGraphQL } from '../useItemApi';

export function useItemVariant({
  itemId,
  variant,
}: {
  itemId: string;
  variant: ItemVariantFragment | null;
}) {
  const t = useTranslation();
  const { mutateAsync } = useUpsert({
    itemId,
  });

  const [draft, setDraft] = useState<ItemVariantFragment>(
    variant ?? {
      __typename: 'ItemVariantNode',
      id: FnUtils.generateUUID(),
      name: '',
      manufacturerId: '',
      coldStorageTypeId: '',
      packagingVariants: [
        {
          __typename: 'PackagingVariantNode',
          id: '1',
          packagingLevel: 1,
          name: t('label.primary'),
          packSize: 1,
          volumePerUnit: 1,
        },
        {
          __typename: 'PackagingVariantNode',
          id: '2',
          packagingLevel: 2,
          name: t('label.secondary'),
          packSize: 2,
          volumePerUnit: 2,
        },
        {
          __typename: 'PackagingVariantNode',
          id: '3',
          packagingLevel: 3,
          name: t('label.tertiary'),
          packSize: 3,
          volumePerUnit: 3,
        },
      ],
    }
  );

  const draftRef = useRef(draft);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  return {
    draft,
    isComplete: getIsComplete(draft),
    updateDraft: (update: Partial<ItemVariantFragment>) =>
      setDraft({ ...draftRef.current, ...update }),
    save: mutateAsync,
  };
}

const useUpsert = ({ itemId }: { itemId: string }) => {
  const { api, storeId, queryClient } = useItemGraphQL();
  const { keys } = useItemApi();
  const t = useTranslation();

  const mutationFn = async (input: ItemVariantFragment) => {
    const apiResult = await api.upsertItemVariant({
      storeId,
      input: {
        id: FnUtils.generateUUID(),
        itemId,
        name: input.name,
        manufacturerId: input.manufacturerId,
        coldStorageTypeId: input.coldStorageTypeId,
        packagingVariants: input.packagingVariants.map(pv => ({
          id: pv.id,
          name: pv.name,
          packagingLevel: pv.packagingLevel,
          packSize: pv.packSize,
          volumePerUnit: pv.volumePerUnit,
        })),
      },
    });
    // will be empty if there's a generic error, such as permission denied
    if (!isEmpty(apiResult)) {
      const result = apiResult.centralServer.itemVariant.upsertItemVariant;
      if (result.__typename === 'ItemVariantNode') {
        return result;
      }
    }
    throw new Error(t('error.failed-to-save-item-variant'));
  };

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries(keys.detail(itemId));
    },
  });
};

function getIsComplete(draft: ItemVariantFragment) {
  return !!draft.name;
}
