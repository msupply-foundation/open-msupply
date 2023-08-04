import { Column, useColumns } from '@openmsupply-client/common';
import { PrescriptionLineFragment } from '../../api';

export const useExpansionColumns = (): Column<PrescriptionLineFragment>[] =>
  useColumns([
    'batch',
    'expiryDate',
    [
      'locationName',
      {
        accessor: ({ rowData }) => rowData.location?.name,
      },
    ],
    [
      'itemUnit',
      {
        accessor: ({ rowData }) => rowData.item?.unitName,
      },
    ],
    'numberOfPacks',
    'packSize',
    [
      'unitQuantity',
      {
        accessor: ({ rowData }) => rowData.packSize * rowData.numberOfPacks,
      },
    ],
    [
      'sellPricePerUnit',
      {
        accessor: ({ rowData }) => rowData.sellPricePerPack,
      },
    ],
  ]);
