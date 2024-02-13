import {
  CellProps,
  DataTable,
  SupplierReturnLine,
  TextInputCell,
  useColumns,
} from 'packages/common/src';
import { ReturnReasonSearchInput } from 'packages/system/src';
import React from 'react';

const ReturnReasonCell = ({
  // rowData,
  rowIndex,
}: CellProps<SupplierReturnLine>): JSX.Element => (
  <ReturnReasonSearchInput
    autoFocus={rowIndex === 0}
    value={{ reason: 'dog ate', id: 'idk', __typename: 'ReturnReasonNode' }}
    onChange={() => {}}
  />
);

export const ReturnReasonsComponent = ({
  lines,
  updateLine,
}: {
  lines: SupplierReturnLine[];
  updateLine: (line: Partial<SupplierReturnLine> & { id: string }) => void;
}) => {
  const columns = useColumns<SupplierReturnLine>(
    [
      'itemCode',
      'itemName',
      'itemUnit',
      ['returnReason', { Cell: ReturnReasonCell, setter: updateLine }],
      ['comment', { Cell: TextInputCell, setter: updateLine }],
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
