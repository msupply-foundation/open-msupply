import { useUnitVariantList } from '../api';
import { create } from 'zustand';
import { UnitVariantNode, VariantNode } from '@common/types';
import { ArrayUtils, NumUtils, isEqual } from '@common/utils';
import { useEffect } from 'react';
import { LocaleKey, TypedTFunction, useTranslation } from '@common/intl';

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
        return {
          // Using function for iterator instead of just itemId for type safety
          items: ArrayUtils.keyBy(newItems, item => item.itemId),
          userSelectedVariants,
        };
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

type CommonAsPackUnit = (_: {
  packSize: number;
  packUnitName?: string;
  unitName: string | null;
  t: TypedTFunction<LocaleKey>;
}) => string;
const commonAsPackUnit: CommonAsPackUnit = ({
  packSize,
  packUnitName,
  unitName,
  t,
}) => {
  if (packUnitName) return packUnitName;
  if (unitName) return `${packSize} ${unitName}`;

  const defaultUnit = t('label.unit');
  return `${packSize} ${defaultUnit}`;
};

export interface VariantControl {
  variants: VariantNode[];
  // Selected by user or mostUsed (calculated by backend)
  activeVariant: VariantNode;
  setUserSelectedVariant: (variantId: string) => void;
}

export const useUnitVariant = (
  itemId: string,
  unitName: string | null
): {
  asPackUnit: (packSize: number) => string;
  numberOfPacksFromQuantity: (totalQuantity: number) => number;
  numberOfPacksToQuantity: (numPacks: number) => number;
  variantsControl?: VariantControl;
} => {
  const [item, userSelectedVariantId, setUserSelectedVariant] = useUnitStore(
    state => [
      state.items[itemId],
      state.userSelectedVariants[itemId],
      state.setUserSelectedVariant,
    ],
    isEqual
  );
  const t = useTranslation();

  if (!item || item.variants.length == 0) {
    return {
      asPackUnit: packSize => commonAsPackUnit({ packSize, unitName, t }),
      numberOfPacksFromQuantity: totalQuantity => totalQuantity,
      numberOfPacksToQuantity: numPacks => numPacks,
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

      return commonAsPackUnit({
        packSize,
        unitName,
        packUnitName: foundVariant?.shortName,
        t,
      });
    },
    numberOfPacksFromQuantity: totalQuantity =>
      NumUtils.round(totalQuantity / activeVariant.packSize, 2),
    numberOfPacksToQuantity: numPacks =>
      NumUtils.round(numPacks * activeVariant.packSize, 2),
    // TODO what if variants were soft deleted ?
    variantsControl: {
      variants: variants,
      activeVariant,
      setUserSelectedVariant: variantId =>
        setUserSelectedVariant({ itemId, variantId }),
    },
  };
};
