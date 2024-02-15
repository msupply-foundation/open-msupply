import {
  CellProps,
  DataTable,
  TextInputCell,
  useColumns,
} from 'packages/common/src';
import { ReturnReasonSearchInput } from 'packages/system/src';
import React from 'react';
import { DraftSupplierReturnLine } from './useDraftReturnLines';

const ReturnReasonCell = ({
  rowData,
  rowIndex,
  column,
}: CellProps<DraftSupplierReturnLine>): JSX.Element => (
  <ReturnReasonSearchInput
    autoFocus={rowIndex === 0}
    selectedReasonId={rowData.reasonId}
    onChange={id => column.setter({ ...rowData, reasonId: id })}
  />
);

export const ReturnReasonsComponent = ({
  lines,
  updateLine,
}: {
  lines: DraftSupplierReturnLine[];
  updateLine: (line: Partial<DraftSupplierReturnLine> & { id: string }) => void;
}) => {
  const columns = useColumns<DraftSupplierReturnLine>(
    [
      'itemCode',
      'itemName',
      // 'itemUnit', // not implemented for now
      ['returnReason', { Cell: ReturnReasonCell, setter: updateLine }],
      ['comment', { Cell: TextInputCell, width: 200, setter: updateLine }],
    ],
    {},
    [updateLine, lines]
  );

  return (
    <DataTable
      id="supplier-return-line-quantity"
      columns={columns}
      data={lines}
      dense
    />
  );
};

export const ReturnReasonsTable = React.memo(ReturnReasonsComponent);
