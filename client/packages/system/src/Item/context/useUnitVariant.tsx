import React, { PropsWithChildren, createContext, useContext } from 'react';
import { useItemVariants } from '../api';
import { NumUtils } from '@common/utils';

export const useUnitVariant = (itemId?: string) => {
  const { data } = useItemVariants();
  const item = data?.find(item => item.id === itemId);

  const asPackUnit = (packSize: number) => {
    return (
      item?.variants.find(variant => variant.packSize === packSize)
        ?.shortName || `${item?.unit} x ${packSize}`
    );
  };

  // calculates SOH, AMC, MOS, Target, Suggested and Requested based on default or user selected variant
  const numberOfPacksFromQuantity = (
    totalQuantity: number,
    packSize: number
  ) => {
    return NumUtils.round(totalQuantity / packSize, 2);
  };

  const options = item?.variants ?? [];

  // const quantityFromNumberOfPacks - reverse of above

  // set in app data
  const setDefaultOption = () => {};

  const defaultOption = () => {
    // TODO: search app data first to see if user has preferred preference
    return item?.variants.find(variant =>
      variant.longName.includes(item?.unit)
    );
  };

  return {
    asPackUnit,
    numberOfPacksFromQuantity,
    options,
    setDefaultOption,
    defaultOption,
  };
};

export type UseUnitVariantContext = ReturnType<typeof useUnitVariant>;

const UnitVariantContext = createContext<UseUnitVariantContext>({} as any);

export const useUnitVariantContext = () => {
  const context = useContext(UnitVariantContext);

  if (!context) throw new Error('Context does not exist');

  return context;
};

type UnitVariantProps = PropsWithChildren<{ itemId?: string }>;

export const UnitVariantProvider: React.FC<
  PropsWithChildren<UnitVariantProps>
> = ({ itemId, children }) => {
  const state = useUnitVariant(itemId);

  return (
    <UnitVariantContext.Provider value={state}>
      {children}
    </UnitVariantContext.Provider>
  );
};
