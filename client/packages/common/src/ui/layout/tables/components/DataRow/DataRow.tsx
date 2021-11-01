import React, { FC } from 'react';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import { Column } from '../../columns/types';
import { DomainObject } from '../../../../../types';
import { useExpanded } from '../..';
import { Collapse } from '@mui/material';

interface DataRowProps<T extends DomainObject> {
  columns: Column<T>[];
  onClick?: (rowValues: T) => void;
  rowData: T;
  rowKey: string;
  ExpandContent?: FC;
}

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
  const minWidth = columns.reduce((sum, { minWidth }) => sum + minWidth, 0);

  return (
    <>
      <TableRow
        sx={{
          minWidth,
          alignItems: 'center',
          height: '40px',
          maxHeight: '45px',
          boxShadow: 'inset 0 0.5px 0 0 rgba(143, 144, 166, 0.5)',
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
                paddingLeft: '16px',
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
      <tr>
        <td style={{ display: 'flex' }}>
          <Collapse sx={{ flex: 1 }} in={isExpanded}>
            {ExpandContent ? <ExpandContent /> : null}
          </Collapse>
        </td>
      </tr>
    </>
  );
};
