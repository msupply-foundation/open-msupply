import React from 'react';
import {
  alpha,
  CellProps,
  ColumnAlign,
  ColumnDescription,
  getExpiryDateInputColumn,
  NumberInputCell,
  TextInputCell,
  Theme,
} from '@openmsupply-client/common';
import { DraftInboundLine } from '../../../../types';
import {
  getVolumePerPackFromVariant,
  ItemVariantInputCell,
  VVMStatusInputCell,
} from '@openmsupply-client/system';

const expiryInputColumn = getExpiryDateInputColumn<DraftInboundLine>();
const getBatchColumn = (
  updateDraftLine: (patch: Partial<DraftInboundLine> & { id: string }) => void,
  theme: Theme
): ColumnDescription<DraftInboundLine> => [
  'batch',
  {
    width: 150,
    maxWidth: 150,
    maxLength: 50,
    Cell: TextInputCell,
    setter: updateDraftLine,
    backgroundColor: alpha(theme.palette.background.menu, 0.4),
    // Remember previously entered batches for this item and suggest them in future shipments
    autocompleteProvider: data => `inboundshipment${data.item.id}`,
    accessor: ({ rowData }) => rowData.batch || '',
  },
];
const getExpiryColumn = (
  updateDraftLine: (patch: Partial<DraftInboundLine> & { id: string }) => void,
  theme: Theme
): ColumnDescription<DraftInboundLine> => [
  expiryInputColumn,
  {
    width: 150,
    maxWidth: 150,
    setter: updateDraftLine,
    backgroundColor: alpha(theme.palette.background.menu, 0.4),
  },
];

export const NumberOfPacksCell = ({
  rowData,
  ...props
}: CellProps<DraftInboundLine>) => (
  <NumberInputCell
    {...props}
    isRequired={rowData.numberOfPacks === 0}
    rowData={rowData}
  />
);

export const getBatchExpiryColumns = (
  updateDraftLine: (patch: Partial<DraftInboundLine> & { id: string }) => void,
  theme: Theme
): ColumnDescription<DraftInboundLine>[] => [
  getBatchColumn(updateDraftLine, theme),
  getExpiryColumn(updateDraftLine, theme),
];

const InboundLineItemVariantInputCell = ({
  rowData,
  ...props
}: CellProps<DraftInboundLine>) => {
  return (
    <ItemVariantInputCell
      {...props}
      rowData={rowData}
      itemId={rowData.item.id}
    />
  );
};

export const itemVariantColumn = (
  updateDraftLine: (patch: Partial<DraftInboundLine> & { id: string }) => void
): ColumnDescription<DraftInboundLine> => ({
  key: 'itemVariantId',
  label: 'label.item-variant',
  width: 150,
  Cell: InboundLineItemVariantInputCell,
  setter: patch => {
    updateDraftLine({
      ...patch,
      volumePerPack: getVolumePerPackFromVariant(patch) ?? patch.volumePerPack,
    });
  },
});

export const vvmStatusesColumn = (
  updateDraftLine: (patch: Partial<DraftInboundLine> & { id: string }) => void
): ColumnDescription<DraftInboundLine> => ({
  key: 'vvmStatusId',
  label: 'label.vvm-status',
  width: 170,
  Cell: VVMStatusInputCell,
  cellProps: {
    useDefault: true,
  },
  accessor: ({ rowData }) => rowData.vvmStatus,
  setter: updateDraftLine,
});

export const getInboundDosesColumns = (
  format: (value: number) => string
): ColumnDescription<DraftInboundLine>[] => [
  {
    key: 'doseQuantity',
    label: 'label.doses-received',
    align: ColumnAlign.Right,
    width: 100,
    accessor: ({ rowData }) => {
      const total = rowData.numberOfPacks * rowData.packSize;
      return format(total * rowData.item.doses);
    },
  },
];
