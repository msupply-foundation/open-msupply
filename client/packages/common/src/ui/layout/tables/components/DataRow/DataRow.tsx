import React, { FC, useCallback } from 'react';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import { Column } from '../../columns/types';
import { DomainObject } from '../../../../../types';
import { TableStore, useTableStore } from '../..';
import { Collapse } from '@mui/material';

interface DataRowProps<T extends DomainObject> {
  columns: Column<T>[];
  onClick?: (rowValues: T) => void;
  rowData: T;
  rowKey: string;
  ExpandContent?: FC;
}

const useExpanded = (rowId: string) => {
  const selector = useCallback(
    (state: TableStore) => {
      return {
        rowId,
        isExpanded: state.rowState[rowId]?.isExpanded,
        toggleExpanded: () => state.toggleExpanded(rowId),
      };
    },
    [rowId]
  );

  const equalityFn = (
    oldState: ReturnType<typeof selector>,
    newState: ReturnType<typeof selector>
  ) =>
    oldState?.isExpanded === newState?.isExpanded &&
    oldState.rowId === newState.rowId;

  const { isExpanded, toggleExpanded } = useTableStore(selector, equalityFn);

  return { isExpanded, toggleExpanded };
};

export const DataRow = <T extends DomainObject>({
  columns,
  onClick,
  rowData,
  rowKey,
  ExpandContent,
}: DataRowProps<T>): JSX.Element => {
  const hasOnClick = !!onClick;
  const { isExpanded } = useExpanded(rowData.id);

  const onRowClick = () => onClick && onClick(rowData);

  return (
    <>
      <TableRow
        sx={{
          alignItems: 'center',
          height: '40px',
          maxHeight: '45px',
          boxShadow: 'inset 0 0.5px 0 0 rgba(143, 144, 166, 0.5)',
          padding: '0px 20px',
          display: 'flex',
          flex: '1 0 auto',
        }}
        onClick={onRowClick}
        hover={hasOnClick}
      >
        {columns.map(column => {
          return (
            <TableCell
              key={`${rowKey}${column.key}`}
              align={column.align}
              sx={{
                borderBottom: 'none',
                justifyContent: 'flex-end',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                padding: 0,
                paddingRight: '16px',
                ...(hasOnClick && { cursor: 'pointer' }),
                flex: `${column.width} 0 auto`,
                minWidth: column.minWidth,
                width: column.width,
              }}
            >
              <column.Cell
                rowData={rowData}
                columns={columns}
                column={column}
                rowKey={rowKey}
              />
            </TableCell>
          );
        })}
      </TableRow>
      <Collapse in={isExpanded}>
        {ExpandContent ? <ExpandContent /> : null}
      </Collapse>
    </>
  );
};
