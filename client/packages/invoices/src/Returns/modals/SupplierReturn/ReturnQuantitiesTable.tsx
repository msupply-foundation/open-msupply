import {
  DataTable,
  NumberInputCell,
  useColumns,
  CellProps,
  ColumnDescription,
  FormErrors,
  ErrorWrapper,
} from '@openmsupply-client/common';

import React from 'react';
import { GenerateSupplierReturnLineFragment } from '../../api';

export const QuantityToReturnTableComponent = ({
  lines,
  updateLine,
  isDisabled,
  formErrors,
}: {
  lines: GenerateSupplierReturnLineFragment[];
  updateLine: (
    line: Partial<GenerateSupplierReturnLineFragment> & { id: string }
  ) => void;
  isDisabled: boolean;
  formErrorState: FormErrors;
}) => {
  const columnDescriptions: ColumnDescription<GenerateSupplierReturnLineFragment>[] =
    [
      'itemCode',
      'itemName',
      'batch',
      'expiryDate',
      [
        'itemUnit',
        {
          accessor: ({ rowData }) => rowData.item.unitName ?? '',
        },
      ],
      'packSize',
      [
        'availableNumberOfPacks',
        {
          description: 'description.pack-quantity',
        },
      ],
      [
        'numberOfPacksToReturn',
        {
          description: 'description.pack-quantity',
          width: 100,
          setter: updateLine,
          // getIsError: () => true,
          getIsDisabled: () => isDisabled,
          Cell: NumberOfPacksToReturnReturnInputCell,
          cellProps: { formErrors },
        },
      ],
    ];

  const columns = useColumns<GenerateSupplierReturnLineFragment>(
    columnDescriptions,
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

const NumberOfPacksToReturnReturnInputCell: React.FC<
  CellProps<GenerateSupplierReturnLineFragment>
> = ({ formErrorState, ...props }) => {
  console.log('formErrors', formErrorState);
  return (
    <ErrorWrapper formErrors={formErrorState} code={props.rowData.id}>
      <NumberInputCell
        {...props}
        isRequired
        max={props.rowData.availableNumberOfPacks}
      />
    </ErrorWrapper>
  );
};

export const QuantityToReturnTable = React.memo(QuantityToReturnTableComponent);
