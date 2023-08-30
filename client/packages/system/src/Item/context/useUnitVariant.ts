import { useUnitVariantList } from '../api';
import { create } from 'zustand';
import { UnitVariantNode } from '@common/types';
import { NumUtils, isEqual } from '@common/utils';
import { useEffect } from 'react';

interface UnitState {
  // From back end
  items: {
    [itemId: string]: UnitVariantNode;
  };
  // Should be called on startup when fetching multi unit variants
  setItems: (newItems: UnitVariantNode[]) => void;
}

const useUnitStore = create<UnitState>(set => {
  return {
    items: {},
    userSelected: {},
    // TODO add user selected

    setItems: newItems =>
      set(() => {
        const items = newItems.reduce(
          (acc, item) => ({ [item.itemId]: item, ...acc }),
          {}
        );
        return { items };
      }),
  };
});

export const useInitUnitStore = () => {
  const { setItems } = useUnitStore();
  // This should happen on startup and when store is changed (for store changed, calculated mostUsed and app data userSelecte would change)
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

export const useUnitVariant = (itemId: string) => {
  // TODO [state.items[itemId], state.userSelected[itemdId]]
  const item = useUnitStore(state => state.items[itemId], isEqual);
  if (!item) {
    return {
      asPackUnit: (packSize: number) => String(packSize),
      numberOfPacksFromQuantity: (totalQuantity: number) => totalQuantity,
    };
  }

  const mostUsedVariant = item.variants.find(
    ({ id }) => id === item.mostUsedVariantId
  )?.packSize;
  const defaultPackSize = /* userSelectedVariantId || */ mostUsedVariant || 1;

  return {
    asPackUnit: (packSize: number) => {
      const foundVariant = item.variants.find(
        variant => variant.packSize === packSize
      );

      if (foundVariant) return foundVariant.shortName;
      if (item.unitName) return `${item?.unitName} x ${packSize}`;
      return `${packSize}`;
    },
    numberOfPacksFromQuantity: (totalQuantity: number) => {
      NumUtils.round(totalQuantity / defaultPackSize, 2);
    },
  };
};
