import {
  ColumnAlign,
  ColumnDescription,
  NumberCell,
} from '@openmsupply-client/common';
import { DosesQuantityCell } from '../api/hooks/utils';
import { DraftStockOutLineFragment } from '../../OutboundShipment/api/operations.generated';

export const getPrescriptionLineDosesColumns = (
  onChange: (key: string, numPacks: number) => void
): ColumnDescription<DraftStockOutLineFragment>[] => [
  {
    Cell: NumberCell,
    label: 'label.doses-available',
    key: 'availableDoses',
    align: ColumnAlign.Right,
    width: 85,
    accessor: ({ rowData }) => {
      const total = (rowData.numberOfPacks ?? 0) * (rowData.packSize ?? 1);

      return (
        total *
        (rowData.itemVariant?.dosesPerUnit ?? rowData.defaultDosesPerUnit)
      );
    },
  },
  // TODO: Add this back?
  // {
  //   Cell: DosesQuantityCell,
  //   label: 'label.doses-issued',
  //   key: 'unitQuantity',
  //   align: ColumnAlign.Right,
  //   width: 120,
  //   setter: ({ packSize, id, unitQuantity, item, itemVariant }) => {
  //     const dosesPerUnit =
  //       itemVariant?.dosesPerUnit ?? rowData.defaultDosesPerUnit ?? 1;

  //     onChange(id, (unitQuantity ?? 0) / (packSize ?? 1) / dosesPerUnit);
  //   },
  //   accessor: ({ rowData }) => {
  //     const totalUnits = (rowData.numberOfPacks ?? 0) * (rowData.packSize ?? 1);

  //     return (
  //       totalUnits * (rowData.itemVariant?.dosesPerUnit ?? rowData.item.doses)
  //     );
  //   },
  // },
];
