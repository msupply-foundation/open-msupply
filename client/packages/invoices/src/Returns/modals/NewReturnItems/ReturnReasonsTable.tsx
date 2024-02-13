import {
  CellProps,
  DataTable,
  TextInputCell,
  useColumns,
} from 'packages/common/src';
import { ReturnReasonSearchInput } from 'packages/system/src';
import React from 'react';
import { DraftReturnLine } from './useDraftNewReturnLines';

const ReturnReasonCell = ({
  rowData,
  rowIndex,
  column,
}: CellProps<DraftReturnLine>): JSX.Element => (
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
  lines: DraftReturnLine[];
  updateLine: (line: Partial<DraftReturnLine> & { id: string }) => void;
}) => {
  const columns = useColumns<DraftReturnLine>(
    [
      'itemCode',
      'itemName',
      'itemUnit',
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
