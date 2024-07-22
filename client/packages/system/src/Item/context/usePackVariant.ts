import { useEffect } from 'react';
import { createWithEqualityFn } from 'zustand/traditional';
import { PackVariantFragment, VariantFragment, usePackVariants } from '../api';
import { ArrayUtils, NumUtils, isEqual } from '@common/utils';
import { LocaleKey, TypedTFunction, useTranslation } from '@common/intl';
import { useAuthContext, useLocalStorage } from '@openmsupply-client/common';
import { Environment } from '@openmsupply-client/config';

interface PackVariantState {
  // From back end
  items: {
    [itemId: string]: PackVariantFragment;
  };
  // Should be called on startup when fetching multi unit variants
  setItems: (newItems: PackVariantFragment[]) => void;
}

const usePackVariantStore = createWithEqualityFn<PackVariantState>(set => {
  return {
    items: {},
    setItems: newItems =>
      set(() => {
        return {
          // Using function for iterator instead of just itemId for type safety
          items: ArrayUtils.keyBy(newItems, item => item.itemId),
        };
      }),
  };
});

type CommonAsPackVariant = (_: {
  packSize: number;
  packVariantName?: string;
  variantName: string | null;
  defaultPackVariant?: string;
  t: TypedTFunction<LocaleKey>;
}) => string;
const commonAsPackVariant: CommonAsPackVariant = ({
  packSize,
  packVariantName,
  variantName,
  defaultPackVariant,
  t,
}) => {
  if (packVariantName) return packVariantName;
  if (defaultPackVariant) return defaultPackVariant;
  const packSizeDispaly = packSize > 1 ? `${packSize} x ` : '';
  if (variantName) return `${packSizeDispaly}${variantName}`;

  const defaultVariant = t('label.unit');
  return `${packSizeDispaly} ${defaultVariant}`;
};

export interface VariantControl {
  variants: VariantFragment[];
  // Selected by user or mostUsed (calculated by backend)
  activeVariant: VariantFragment;
  setUserSelectedPackVariant: (variantId: string) => void;
}

// Will call API to refresh pack variant if cache is expired
// or if store is changed (based on cache keys)
export const useRefreshPackVariant = () => {
  const { setItems } = usePackVariantStore();

  const { data } = usePackVariants();

  useEffect(() => {
    setItems(data?.nodes || []);
  }, [data, setItems]);
};

export const useIsPackVariantsEnabled = () => {
  // For now, we are using a feature flag to enable pack variants
  return Environment.FEATURE_PACK_VARIANTS;

  // const { items } = usePackVariantStore();
  // // If any pack variants are defined, then pack variants feature is enabled
  // return Object.keys(items).length > 0;
};

export const usePackVariant = (
  itemId: string,
  variantName: string | null
): {
  // If pack variant not found, use defaultPackVariant rather than
  // {packSize} {unitName or 'Unit'}
  asPackVariant: (packSize: number, defaultPackVariant?: string) => string;
  activePackVariant: string;
  numberOfPacksFromQuantity: (totalQuantity: number) => number;
  numberOfPacksToTotalQuantity: (numPacks: number) => number;
  variantsControl?: VariantControl;
  packVariantExists: boolean;
} => {
  const authContext = useAuthContext();
  const t = useTranslation();
  const [UserSelectedPackVariant, setUserSelectedPackVariant] = useLocalStorage(
    `/user/${authContext.user?.id ?? ''}/store/${
      authContext.storeId
    }/selectedvariant`
  );
  const UserSelectedPackVariantId = UserSelectedPackVariant?.[itemId];
  const item = usePackVariantStore(state => state.items[itemId], isEqual);

  const isPackVariantsEnabled = useIsPackVariantsEnabled();

  if (!isPackVariantsEnabled || !item || item.packVariants.length == 0) {
    return {
      asPackVariant: (packSize, defaultPackVariant) =>
        commonAsPackVariant({ packSize, variantName, t, defaultPackVariant }),
      numberOfPacksFromQuantity: totalQuantity => totalQuantity,
      numberOfPacksToTotalQuantity: numPacks => numPacks,
      packVariantExists: false,
      activePackVariant: commonAsPackVariant({ packSize: 1, variantName, t }),
    };
  }

  const { packVariants, mostUsedPackVariantId } = item;

  const mostUsedVariant = packVariants.find(
    ({ id }) => id === mostUsedPackVariantId
  );
  const selectedVariant = packVariants.find(
    ({ id }) => id === UserSelectedPackVariantId
  );

  const activeVariant =
    selectedVariant ||
    mostUsedVariant ||
    (packVariants[0] as VariantFragment); /* item.variants.length === 0 above confirms that it's safe to assume it will not be undefined */

  return {
    asPackVariant: (packSize, defaultPackVariant) => {
      const foundVariant = packVariants.find(
        packVariants => packVariants.packSize === packSize
      );

      return commonAsPackVariant({
        packSize,
        variantName,
        packVariantName: foundVariant?.shortName,
        defaultPackVariant,
        t,
      });
    },
    numberOfPacksFromQuantity: totalQuantity =>
      NumUtils.round(totalQuantity / activeVariant.packSize, 2),
    numberOfPacksToTotalQuantity: numPacks =>
      NumUtils.round(numPacks * activeVariant.packSize, 2),
    // TODO what if variants were soft deleted ?
    variantsControl: {
      variants: packVariants,
      activeVariant,
      setUserSelectedPackVariant: variantId =>
        setUserSelectedPackVariant({
          ...UserSelectedPackVariant,
          [itemId]: variantId,
        }),
    },
    packVariantExists: true,
    activePackVariant: commonAsPackVariant({
      packSize: activeVariant.packSize,
      variantName,
      t,
    }),
  };
};
