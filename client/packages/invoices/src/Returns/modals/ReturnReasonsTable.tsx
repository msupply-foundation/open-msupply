import {
  CellProps,
  DataTable,
  TextInputCell,
  useColumns,
} from 'packages/common/src';
import { ReturnReasonSearchInput } from 'packages/system/src';
import React from 'react';

interface ReturnWithReason {
  id: string;
  itemCode: string;
  itemName: string;
  note?: string | null;
  reasonId?: string | null;
}

const ReturnReasonCell = ({
  rowData,
  rowIndex,
  column,
}: CellProps<ReturnWithReason>): JSX.Element => (
  <ReturnReasonSearchInput
    autoFocus={rowIndex === 0}
    selectedReasonId={rowData.reasonId ?? null}
    onChange={id => column.setter({ ...rowData, reasonId: id })}
  />
);

export const ReturnReasonsComponent = ({
  lines,
  updateLine,
}: {
  lines: ReturnWithReason[];
  updateLine: (line: Partial<ReturnWithReason> & { id: string }) => void;
}) => {
  const columns = useColumns<ReturnWithReason>(
    [
      'itemCode',
      'itemName',
      // 'itemUnit', // not implemented for now
      ['returnReason', { Cell: ReturnReasonCell, setter: updateLine }],
      {
        key: 'note',
        label: 'label.comment',
        Cell: TextInputCell,
        width: 200,
        setter: updateLine,
        accessor: ({ rowData }) => rowData.note ?? '',
      },
    ],
    {},
    [updateLine, lines]
  );

  return (
    <DataTable id="return-line-reason" columns={columns} data={lines} dense />
  );
};

export const ReturnReasonsTable = React.memo(ReturnReasonsComponent);
