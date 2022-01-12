import React, { FC } from 'react';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import { Column } from '../../columns/types';
import { DomainObject } from '@common/types';
import { useExpanded, useDisabled } from '../../context';
import { Collapse } from '@mui/material';

interface DataRowProps<T extends DomainObject> {
  columns: Column<T>[];
  rows: T[];
  onClick?: (rowData: T) => void;
  rowData: T;
  rowKey: string;
  ExpandContent?: FC<{ rowData: T }>;
  dense?: boolean;
  rowIndex: number;
}

export const DataRow = <T extends DomainObject>({
  columns,
  onClick,
  rowData,
  rowKey,
  rowIndex,
  ExpandContent,
  dense = false,
  rows,
}: DataRowProps<T>): JSX.Element => {
  const hasOnClick = !!onClick;
  const { isExpanded } = useExpanded(rowData.id);
  const { isDisabled } = useDisabled(rowData.id);

  const onRowClick = () => onClick && onClick(rowData);
  const minWidth = columns.reduce((sum, { minWidth }) => sum + minWidth, 0);

  return (
    <>
      <TableRow
        sx={{
          color: isDisabled ? 'gray.main' : 'black',
          minWidth,
          alignItems: 'center',
          height: '40px',
          maxHeight: '45px',
          boxShadow: dense
            ? 'none'
            : 'inset 0 0.5px 0 0 rgba(143, 144, 166, 0.5)',
          display: 'flex',
          flex: '1 0 auto',
        }}
        onClick={onRowClick}
        hover={hasOnClick}
      >
        {columns.map((column, columnIndex) => {
          return (
            <TableCell
              key={`${rowKey}${column.key}`}
              align={column.align}
              sx={{
                borderBottom: 'none',
                justifyContent: 'flex-end',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                paddingLeft: '16px',
                paddingRight: '16px',
                ...(hasOnClick && { cursor: 'pointer' }),
                flex: `${column.width} 0 auto`,
                minWidth: column.minWidth,
                width: column.width,
                color: 'inherit',
                fontSize: dense ? '12px' : '14px',
                padding: dense ? '12px' : undefined,
              }}
            >
              <column.Cell
                rows={rows}
                rowData={rowData}
                columns={columns}
                column={column}
                rowKey={rowKey}
                columnIndex={columnIndex}
                rowIndex={rowIndex}
              />
            </TableCell>
          );
        })}
      </TableRow>
      <tr style={{ display: 'flex' }}>
        <td style={{ display: 'flex', flex: 1 }}>
          <Collapse
            sx={{
              flex: 1,
              display: 'flex',
              '& .MuiCollapse-wrapperInner': {
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
              },
            }}
            in={isExpanded}
          >
            {ExpandContent ? <ExpandContent rowData={rowData} /> : null}
          </Collapse>
        </td>
      </tr>
    </>
  );
};
