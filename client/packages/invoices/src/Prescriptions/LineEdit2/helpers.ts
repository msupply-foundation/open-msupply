import { LocaleKey, TypedTFunction } from '@common/intl';
import { DraftPrescriptionLine } from '../../types';
import { NumUtils } from '@common/utils';
import { ItemNode } from '@common/types';
import { getAllocationAlerts } from '../../StockOut';

// TODO HELPER TESTS

export const summarisePrescribedStock = (
  lines: DraftPrescriptionLine[],
  t: TypedTFunction<LocaleKey>
) => {
  // Count how many of each pack size
  const counts: Record<number, { unitName: string; count: number }> = {};
  lines.forEach(({ packSize, numberOfPacks, stockLine }) => {
    if (numberOfPacks === 0) return;
    if (counts[packSize]) {
      counts[packSize].count += packSize * numberOfPacks;
    } else {
      counts[packSize] = {
        unitName: (stockLine?.item as ItemNode)?.unitName ?? 'unit',
        count: NumUtils.round(packSize * numberOfPacks),
      };
    }
  });

  // Summarise counts in words
  const summary: string[] = [];
  Object.entries(counts).forEach(([size, { unitName, count }]) => {
    const unitWord = t('label.unit-plural', {
      count,
      unit: unitName,
    });
    if (Number(size) > 1) {
      const packs = NumUtils.round(count / Number(size), 3);
      summary.push(t('label.packs-of-size', { packs, count, size, unitWord }));
    } else {
      summary.push(t('label.packs-of-1', { count, unitWord }));
    }
  });

  return summary.join('\n');
};

export function getPrescriptionAllocationAlerts(
  allocatedLines: DraftPrescriptionLine[] | undefined,
  allocatedQuantity: number,
  requestedQuantity: number,
  placeholderQuantity: number,
  hasOnHold: boolean,
  hasExpired: boolean,
  format: (value: number, options?: Intl.NumberFormatOptions) => string,
  t: TypedTFunction<LocaleKey>
) {
  const nearestWholePackQuantity = allocatedLines?.reduce(
    (acc, { numberOfPacks, packSize }) =>
      acc + Math.ceil(numberOfPacks) * packSize,
    0
  );

  const hasRequestedOverAvailable =
    !!allocatedLines && requestedQuantity > allocatedQuantity;

  const alerts = getAllocationAlerts(
    requestedQuantity,
    // suppress here, custom below
    hasRequestedOverAvailable ? 0 : allocatedQuantity,
    placeholderQuantity,
    hasOnHold,
    hasExpired,
    format,
    t
  );
  if (hasRequestedOverAvailable) {
    alerts.push({
      message: t('warning.cannot-create-placeholder-units', {
        allocatedQuantity: format(allocatedQuantity),
        requestedQuantity: format(requestedQuantity),
      }),
      severity: 'warning',
    });
  }
  if (nearestWholePackQuantity !== allocatedQuantity) {
    alerts.push({
      message: t('messages.partial-pack-warning', {
        nearestAbove: nearestWholePackQuantity,
      }),
      severity: 'warning',
    });
  }

  return alerts;
}
