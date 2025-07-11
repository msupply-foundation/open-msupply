import { useState } from 'react';
import {
  FnUtils,
  isEmpty,
  setNullableInput,
  useMutation,
  useTranslation,
} from '@openmsupply-client/common';
import {
  ItemRowFragment,
  ItemVariantFragment,
  PackagingVariantFragment,
} from '../../operations.generated';
import { useItemApi, useItemGraphQL } from '../useItemApi';
import { ITEM_VARIANTS } from '../../keys';

export function useItemVariant({
  item,
  variant,
}: {
  item: ItemRowFragment;
  variant: ItemVariantFragment | null;
}) {
  const t = useTranslation();
  const { mutateAsync } = useUpsert({
    itemId: item.id,
  });

  const [draft, setDraft] = useState<ItemVariantFragment>(
    variant ?? {
      __typename: 'ItemVariantNode',
      id: FnUtils.generateUUID(),
      name: '',
      itemId: item.id,
      manufacturerId: null,
      coldStorageTypeId: null,
      packagingVariants: [
        {
          __typename: 'PackagingVariantNode',
          id: FnUtils.generateUUID(),
          packagingLevel: 1,
          name: t('label.primary'),
        },
        {
          __typename: 'PackagingVariantNode',
          id: FnUtils.generateUUID(),
          packagingLevel: 2,
          name: t('label.secondary'),
        },
        {
          __typename: 'PackagingVariantNode',
          id: FnUtils.generateUUID(),
          packagingLevel: 3,
          name: t('label.tertiary'),
        },
      ],
      item: {
        __typename: 'ItemNode',
        id: item.id,
        name: item.name,
        isVaccine: item.isVaccine,
      },
      bundledItemVariants: [],
      bundlesWith: [],
      vvmType: null,
    }
  );

  const updatePackagingVariant = (update: Partial<PackagingVariantFragment>) =>
    setDraft(currentDraft => ({
      ...currentDraft,
      packagingVariants: currentDraft.packagingVariants.map(pv =>
        pv.id === update.id ? { ...pv, ...update } : pv
      ),
    }));

  return {
    draft,
    isComplete: getIsComplete(draft),
    updateDraft: (update: Partial<ItemVariantFragment>) =>
      setDraft(currentDraft => ({ ...currentDraft, ...update })),
    updatePackagingVariant,
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
        id: input.id,
        itemId,
        name: input.name,
        manufacturerId: setNullableInput('manufacturerId', input),
        coldStorageTypeId: setNullableInput('coldStorageTypeId', input),
        packagingVariants: input.packagingVariants.map(pv => ({
          id: pv.id,
          name: pv.name,
          packagingLevel: pv.packagingLevel,
          packSize: pv.packSize,
          volumePerUnit: pv.volumePerUnit,
        })),
        vvmType: setNullableInput('vvmType', input),
      },
    });
    // will be empty if there's a generic error, such as permission denied
    if (!isEmpty(apiResult)) {
      const result = apiResult.centralServer.itemVariant.upsertItemVariant;
      if (result.__typename === 'ItemVariantNode') {
        return result;
      }
      if (result.__typename === 'UpsertItemVariantError') {
        if (result.error.__typename === 'UniqueValueViolation') {
          throw new Error(t('error.duplicate-item-variant-name'));
        }
      }
    }
    throw new Error(t('error.failed-to-save-item-variant'));
  };

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries(keys.detail(itemId));
      queryClient.invalidateQueries(ITEM_VARIANTS);
    },
  });
};

function getIsComplete(draft: ItemVariantFragment) {
  return (
    !!draft.name &&
    draft.packagingVariants.every(
      pv => pv.packSize !== 0 && pv.volumePerUnit !== 0
    )
  );
}
