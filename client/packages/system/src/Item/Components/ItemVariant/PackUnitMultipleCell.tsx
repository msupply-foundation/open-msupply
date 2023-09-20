import { CellProps, ArrayUtils } from '@openmsupply-client/common';
import { useUnitVariant } from '../../context';
import { ItemRowFragment } from '../../api';

export interface PackUnitMultipleCellProps<T> {
  id: string;
  item?: ItemRowFragment | null;
  lines?: T[];
}

export const PackUnitMultipleCell = <
  L extends { packSize?: number | null; item?: ItemRowFragment | null },
  T extends PackUnitMultipleCellProps<L>,
>({
  rowData,
}: CellProps<T>) => {
  if ('lines' in rowData) {
    const { lines } = rowData;
    if (!lines) return;

    const packUnits = lines.map(line => {
      const { asPackUnit } = useUnitVariant(
        line.item?.id ?? '',
        line.item?.unitName ?? null
      );

      return {
        unit: asPackUnit(line?.packSize ?? 1),
      };
    });
    return (
      ArrayUtils.ifTheSameElseDefault(packUnits, 'unit', '[multiple]') ?? ''
    );
  }
};
