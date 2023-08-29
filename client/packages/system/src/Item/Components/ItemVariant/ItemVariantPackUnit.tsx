import React, { ReactElement } from 'react';
import {
  RecordWithId,
  CellProps,
  BasicCell,
  Column,
} from '@openmsupply-client/common';
import { useUnitVariant } from '../../context';

// Uses BasicCell but replaces accessor with asPackUnit
export const getItemVariantPackUnit =
  <T extends RecordWithId>(getItemId: (row: T) => string) =>
  (props: CellProps<T>): ReactElement => {
    const { rowData, column } = props;
    const { asPackUnit } = useUnitVariant(getItemId(rowData));

    const accessor: Column<T>['accessor'] = props =>
      asPackUnit(Number(column.accessor(props)));

    let newProps = { ...props, column: { ...column, accessor } };

    return <BasicCell {...newProps} />;
  };
