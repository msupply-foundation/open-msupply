import { useOutboundNumber } from './useOutboundNumber';
import { useOutboundIsDisabled } from './useOutboundIsDisabled';
import { useOutboundApi } from './useOutboundApi';
import { useAddFromMasterList } from './useAddFromMasterList';
import { useBarcode } from './useBarcode';
import { useBarcodeInsert } from './useBarcodeInsert';
import { useSelectedIds } from './useSelectedIds';
export * from './useGetDiscountPercentage';

export const Utils = {
  useAddFromMasterList,
  useOutboundNumber,
  useOutboundIsDisabled,
  useOutboundApi,
  useBarcode,
  useBarcodeInsert,
  useSelectedIds,
};
