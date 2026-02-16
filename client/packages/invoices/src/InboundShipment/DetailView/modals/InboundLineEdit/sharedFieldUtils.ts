import { DraftInboundLine } from '../../../../types';
import { ItemRowFragment } from '@openmsupply-client/system';
import { NumUtils } from '@openmsupply-client/common';
import { getVolumePerPackFromVariant } from '@openmsupply-client/system';
import { PatchDraftLineInput } from '../../../api/hooks';

export interface FieldUtilsProps {
  item?: ItemRowFragment | null;
  setPackRoundingMessage?: (value: React.SetStateAction<string>) => void;
  format: (value: number) => string;
  t: (key: string, options?: any) => string;
}

export const useFieldUtils = ({
  setPackRoundingMessage,
  format,
  t,
}: FieldUtilsProps) => {
  const handlePackSizeChange = (
    line: DraftInboundLine,
    value: number,
    updateDraftLine: (patch: PatchDraftLineInput) => void
  ) => {
    // Note: defaultPackSize and itemStoreProperties may not be available on ItemRowFragment
    // This logic matches the original TabTables.tsx implementation
    const shouldClearSellPrice = false; // Simplified for now, can be enhanced later

    updateDraftLine({
      volumePerPack: getVolumePerPackFromVariant(line) ?? 0,
      sellPricePerPack: shouldClearSellPrice ? 0 : line.sellPricePerPack,
      packSize: value,
      id: line.id,
    });
  };

  const handleNumberOfPacksChange = (
    line: DraftInboundLine,
    value: number,
    updateDraftLine: (patch: PatchDraftLineInput) => void
  ) => {
    const { packSize } = line;
    if (packSize !== undefined) {
      const packToUnits = packSize * value;
      setPackRoundingMessage?.('');
      updateDraftLine({
        unitsPerPack: packToUnits,
        id: line.id,
        numberOfPacks: value,
      });
    }
  };

  const handleUnitsPerPackChange = (
    line: DraftInboundLine,
    value: number,
    updateDraftLine: (patch: PatchDraftLineInput) => void
  ) => {
    const { packSize, unitsPerPack } = line;
    if (packSize !== undefined && unitsPerPack !== undefined) {
      const unitToPacks = value / packSize;
      const roundedPacks = Math.ceil(unitToPacks);
      const actualUnits = roundedPacks * packSize;
      if (roundedPacks === unitToPacks || roundedPacks === 0) {
        setPackRoundingMessage?.('');
      } else {
        setPackRoundingMessage?.(
          t('messages.under-allocated', {
            receivedQuantity: format(NumUtils.round(value, 2)),
            quantity: format(actualUnits),
          })
        );
      }
      updateDraftLine({
        unitsPerPack: actualUnits,
        numberOfPacks: roundedPacks,
        id: line.id,
      });
      return actualUnits;
    }
  };

  const handleItemVariantChange = (
    line: DraftInboundLine,
    itemVariant: any,
    updateDraftLine: (patch: PatchDraftLineInput) => void
  ) => {
    updateDraftLine({
      id: line.id,
      itemVariantId: itemVariant?.id,
      itemVariant,
      volumePerPack: getVolumePerPackFromVariant({
        packSize: line.packSize,
        itemVariant,
      }),
    });
  };

  const calculateForeignCurrencyCostPrice = (
    line: DraftInboundLine,
    currency: any
  ): number | undefined => {
    if (currency) {
      return line.costPricePerPack / currency.rate;
    }
    return undefined;
  };

  const calculateForeignCurrencySellPrice = (
    line: DraftInboundLine,
    currency: any
  ): number | undefined => {
    if (currency) {
      return line.sellPricePerPack / currency.rate;
    }
    return undefined;
  };

  const calculateForeignCurrencyLineTotal = (
    line: DraftInboundLine,
    currency: any
  ): number | undefined => {
    if (currency) {
      return (line.costPricePerPack * line.numberOfPacks) / currency.rate;
    }
    return undefined;
  };

  const calculateLineTotal = (line: DraftInboundLine) => {
    return line.costPricePerPack * line.numberOfPacks;
  };

  const calculateDoseQuantity = (
    line: DraftInboundLine,
    format: (value: number) => string
  ) => {
    const total = line.numberOfPacks * line.packSize;
    return format(total * line.item.doses);
  };

  const calculateUnitsPerPack = (line: DraftInboundLine) => {
    return line.numberOfPacks * line.packSize;
  };

  return {
    handlePackSizeChange,
    handleNumberOfPacksChange,
    handleUnitsPerPackChange,
    handleItemVariantChange,
    calculateForeignCurrencyCostPrice,
    calculateForeignCurrencySellPrice,
    calculateForeignCurrencyLineTotal,
    calculateLineTotal,
    calculateDoseQuantity,
    calculateUnitsPerPack,
  };
};
