import { useUnitVariantList } from '../api';
import { create } from 'zustand';
import { UnitVariantNode, VariantNode } from '@common/types';
import { NumUtils, isEqual } from '@common/utils';
import { useEffect } from 'react';

type UserSelectedVariants = {
  [itemId: string]: /* userSelectedVariantId */ string;
};
interface UnitState {
  // From back end
  items: {
    [itemId: string]: UnitVariantNode;
  };
  userSelectedVariants: UserSelectedVariants;
  setUserSelectedVariant: (_: { itemId: string; variantId: string }) => void;
  // Should be called on startup when fetching multi unit variants
  setItems: (newItems: UnitVariantNode[]) => void;
}

const useUnitStore = create<UnitState>(set => {
  return {
    items: {},
    userSelectedVariants: {},
    // TODO add user selected
    setUserSelectedVariant: ({ itemId, variantId }) =>
      set(({ userSelectedVariants, items }) => ({
        items,
        userSelectedVariants: { ...userSelectedVariants, [itemId]: variantId },
      })),
    setItems: newItems =>
      set(({ userSelectedVariants }) => {
        const items = newItems.reduce(
          (acc, item) => ({ [item.itemId]: item, ...acc }),
          {}
        );
        return { items, userSelectedVariants };
      }),
  };
});

export const useInitUnitStore = () => {
  const { setItems } = useUnitStore();
  // This should happen on startup and when store is changed (when the store changed, calculated values of mostUsedVariant and app data userSelected would change)
  // Suggested places:
  // https://github.com/openmsupply/open-msupply/blob/312b837c3d17a1ead05e140b7668cd5f45dffbc3/client/packages/common/src/authentication/api/hooks/useLogin.ts#L107
  // https://github.com/openmsupply/open-msupply/blob/312b837c3d17a1ead05e140b7668cd5f45dffbc3/client/packages/common/src/authentication/AuthContext.tsx#L125
  const { data } = useUnitVariantList();

  useEffect(() => {
    if (!data) return;
    setItems(data || []);
  }, [data]);

  // TODO add user selected from app data
};

export const useUnitVariant = (
  itemId: string
): {
  asPackUnit: (packSize: number) => string;
  numberOfPacksFromQuantity: (totalQuantity: number) => number;
  variantsControl?: {
    variants: VariantNode[];
    // Selected by user or mostUsed (calculated by backend)
    activeVariant: VariantNode;
    setUserSelectedVariant: (variantId: string) => void;
  };
} => {
  const [item, userSelectedVariantId, setUserSelectedVariant] = useUnitStore(
    state => [
      state.items[itemId],
      state.userSelectedVariants[itemId],
      state.setUserSelectedVariant,
    ],
    isEqual
  );

  if (!item || item.variants.length == 0) {
    return {
      asPackUnit: packSize => String(packSize),
      numberOfPacksFromQuantity: totalQuantity => totalQuantity,
    };
  }

  const { variants, mostUsedVariantId } = item;

  const mostUsedVariant = variants.find(({ id }) => id === mostUsedVariantId);
  const userSelectedVariant = variants.find(
    ({ id }) => id === userSelectedVariantId
  );

  const activeVariant =
    userSelectedVariant ||
    mostUsedVariant ||
    (variants[0] as VariantNode); /* item.variants.length === 0 above confirms that it's safe to assume it will not be undefined */

  return {
    asPackUnit: packSize => {
      const foundVariant = variants.find(
        variant => variant.packSize === packSize
      );

      if (foundVariant) return foundVariant.shortName;
      if (item.unitName) return `${item?.unitName} x ${packSize}`;
      return `${packSize}`;
    },
    numberOfPacksFromQuantity: totalQuantity =>
      NumUtils.round(totalQuantity / activeVariant.packSize, 2),
    // TODO what if variants were soft deleted ?
    variantsControl: {
      variants: variants,
      activeVariant,
      setUserSelectedVariant: variantId =>
        setUserSelectedVariant({ itemId, variantId }),
    },
  };
};
