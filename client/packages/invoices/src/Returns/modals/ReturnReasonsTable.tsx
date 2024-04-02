import {
  CellProps,
  DataTable,
  TextInputCell,
  useColumns,
} from '@openmsupply-client/common';
import { ReturnReasonSearchInput } from '@openmsupply-client/system';
import React from 'react';

interface ReturnWithReason {
  id: string;
  itemCode: string;
  itemName: string;
  expiryDate?: string | null;
  batch?: string | null;
  note?: string | null;
  reasonId?: string | null;
}

const ReturnReasonCell = ({
  rowData,
  rowIndex,
  column,
  isDisabled,
}: CellProps<ReturnWithReason>): JSX.Element => (
  <ReturnReasonSearchInput
    autoFocus={rowIndex === 0}
    selectedReasonId={rowData.reasonId ?? null}
    onChange={id => column.setter({ ...rowData, reasonId: id })}
    isDisabled={isDisabled}
  />
);

export const ReturnReasonsComponent = ({
  lines,
  updateLine,
  isDisabled,
}: {
  lines: ReturnWithReason[];
  updateLine: (line: Partial<ReturnWithReason> & { id: string }) => void;
  isDisabled: boolean;
}) => {
  const columns = useColumns<ReturnWithReason>(
    [
      'itemCode',
      'itemName',
      'batch',
      'expiryDate',
      // 'itemUnit', // not implemented for now
      [
        'returnReason',
        {
          Cell: ReturnReasonCell,
          setter: updateLine,
          getIsDisabled: () => isDisabled,
        },
      ],
      {
        key: 'note',
        label: 'label.comment',
        Cell: TextInputCell,
        width: 200,
        setter: updateLine,
        accessor: ({ rowData }) => rowData.note ?? '',
        getIsDisabled: () => isDisabled,
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
