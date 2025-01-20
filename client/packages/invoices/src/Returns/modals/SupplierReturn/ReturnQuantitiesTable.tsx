import {
  DataTable,
  NumberInputCell,
  useColumns,
  CellProps,
  ColumnDescription,
  FormErrors,
} from '@openmsupply-client/common';

import React, { Children, PropsWithChildren, useCallback } from 'react';
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
  formErrors: FormErrors;
}) => {
  // const NumberOfPacksToReturnReturnInputCell: React.FC<
  //   CellProps<GenerateSupplierReturnLineFragment>
  // > = React.memo(props => {
  //   const code = props.rowData.id;
  //   console.log('props', props);
  //   return (
  //     // <ErrorWrapper formErrors={props.formErrors} code={props.rowData.id}>
  //     <NumberInputCell
  //       {...props}
  //       isRequired
  //       max={props.rowData.availableNumberOfPacks}
  //       // code={props.rowData.id}
  //       // errorMessage="This is an error"
  //     />
  //     // </ErrorWrapper>
  //   );
  // });

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
          //  props => (
          //   <NumberInputCell {...props} decimalLimit={2} min={0} />
          // <NumberOfPacksToReturnReturnInputCell {...props} />
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

// Input cells can't be defined inline, otherwise they lose focus on re-render
const NumberOfPacksToReturnReturnInputCell: React.FC<
  CellProps<GenerateSupplierReturnLineFragment>
> = ({ formErrors, ...props }) => {
  const code = props.rowData.id;
  console.log('props', formErrors);
  return (
    <ErrorWrapper formErrors={formErrors} code={props.rowData.id}>
      <NumberInputCell
        {...props}
        isRequired
        max={props.rowData.availableNumberOfPacks}
        // code={props.rowData.id}
        // errorMessage="This is an error"
      />
    </ErrorWrapper>
  );
};

export const QuantityToReturnTable = React.memo(QuantityToReturnTableComponent);

interface ErrorWrapperProps {
  code: string;
  formErrors: FormErrors;
}

const ErrorWrapper: React.FC<PropsWithChildren<ErrorWrapperProps>> = ({
  children,
  code,
  formErrors,
}) => {
  const { errors, setError, getError, hasErrors, clearErrors, getErrorSetter } =
    formErrors;

  const errorMessage = errors[code] ?? undefined;
  const error = !!errorMessage;
  const setThisError = useCallback(() => getErrorSetter(code), [code]);

  return Children.map(children, child =>
    React.cloneElement(child, { error, errorMessage, setError: setThisError })
  );
};
