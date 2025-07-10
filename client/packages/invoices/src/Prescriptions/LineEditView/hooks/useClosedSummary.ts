import { LocaleKey, TypedTFunction } from '@common/intl';
import { NumUtils } from '@common/utils';
import { DraftStockOutLineFragment } from 'packages/invoices/src/StockOut';

export const useClosedSummary = () => {
  const summarise = (
    t: TypedTFunction<LocaleKey>,
    unitName: string,
    lines: DraftStockOutLineFragment[],
    getPlural: (word: string, count: number) => string
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
    const summary: { qty: number; text: string; tooltip: number }[] = [];
    Object.entries(counts).forEach(([size, { unitName, count: numUnits }]) => {
      const packSize = Number(size);
      if (packSize > 1) {
        const numPacks = NumUtils.round(numUnits / packSize, 2);
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
        const tooltip = numUnits / packSize;
        summary.push({ qty: numPacks, text, tooltip });
      } else {
        const unitType = getPlural(unitName, numUnits);
        const text = t('label.packs-of-1', { numUnits, unitType });
        const tooltip = numUnits;
        summary.push({ qty: numUnits, text, tooltip });
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

    const roundedDoses = NumUtils.round(totalDoses);

    const unitWord = t('label.doses-plural', {
      count: roundedDoses,
    });
    const text = `${roundedDoses} ${unitWord}`;
    const tooltip = totalDoses;
    return [{ text, tooltip }];
  };

  return { summarise, dosesSummary };
};
