import {
  LocaleKey,
  TypedTFunction,
  useFormatNumber,
  useIntlUtils,
} from '@common/intl';
import { NumUtils } from '@common/utils';
import { DraftStockOutLineFragment } from 'packages/invoices/src/StockOut';

export const useClosedSummary = () => {
  const formatNumber = useFormatNumber();
  const { getPlural } = useIntlUtils();

  const getDisplayValue = (value: number) => {
    const formatted = formatNumber.round(value, 2);
    return NumUtils.hasMoreThanTwoDp(value)
      ? `${formatted}... `
      : `${formatted} `;
  };

  const summarise = (
    t: TypedTFunction<LocaleKey>,
    unitName: string,
    lines: DraftStockOutLineFragment[]
  ) => {
    // Count how many of each pack size
    const counts: Record<number, { unitName: string; count: number }> = {};
    lines.forEach(({ packSize, numberOfPacks }) => {
      if (numberOfPacks === 0) return;
      if (counts[packSize]) {
        counts[packSize].count += packSize * numberOfPacks;
      } else {
        counts[packSize] = {
          unitName,
          count: NumUtils.round(packSize * numberOfPacks, 2),
        };
      }
    });

    // Summarise counts in words
    const summary: { displayValue: string; text: string; tooltip: string }[] =
      [];
    Object.entries(counts).forEach(([size, { unitName, count: numUnits }]) => {
      const packSize = Number(size);
      if (packSize > 1) {
        const totalPacks = numUnits / packSize;
        const numPacks = NumUtils.round(totalPacks, 2);
        const packWord = t('label.packs-of', { count: numPacks }); // pack or packs
        const unitWord = t('label.units-plural', { count: numUnits }); // unit or units
        const unitType = getPlural(unitName, packSize);
        const text = t('label.packs-of-size', {
          numUnits,
          packSize,
          unitType,
          packWord,
          unitWord,
        });
        const tooltip = formatNumber.tooltip(numUnits / packSize);
        const displayValue = getDisplayValue(totalPacks);

        summary.push({ displayValue, text, tooltip });
      } else {
        const unitType = getPlural(unitName, numUnits);
        const text = t('label.packs-of-1', { numUnits, unitType });
        const tooltip = formatNumber.tooltip(numUnits);
        const displayValue = getDisplayValue(numUnits);
        summary.push({ displayValue, text, tooltip });
      }
    });
    return summary;
  };

  const dosesSummary = (
    t: TypedTFunction<LocaleKey>,
    lines: DraftStockOutLineFragment[]
  ) => {
    const totalDoses = lines.reduce(
      (sum, { packSize, numberOfPacks, dosesPerUnit }) =>
        sum + packSize * numberOfPacks * dosesPerUnit,
      0
    );

    const displayValue = getDisplayValue(totalDoses);
    const unitWord = t('label.doses-plural', {
      count: totalDoses,
    });
    const tooltip = formatNumber.tooltip(totalDoses);

    return [{ displayValue, text: unitWord, tooltip }];
  };

  return { summarise, dosesSummary };
};
