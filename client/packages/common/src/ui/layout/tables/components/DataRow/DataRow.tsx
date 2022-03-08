import React, { FC } from 'react';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import { Column } from '../../columns/types';
import { RecordWithId } from '@common/types';
import { useExpanded, useIsDisabled, useRowStyle } from '../../context';
import { Collapse, Fade } from '@mui/material';

interface DataRowProps<T extends RecordWithId> {
  columns: Column<T>[];
  rows: T[];
  onClick?: (rowData: T) => void;
  rowData: T;
  rowKey: string;
  ExpandContent?: FC<{ rowData: T }>;
  dense?: boolean;
  rowIndex: number;
}

export const DataRow = <T extends RecordWithId>({
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
  const { isDisabled } = useIsDisabled(rowData.id);
  const { rowStyle } = useRowStyle(rowData.id);

  const onRowClick = () => onClick && onClick(rowData);
  const minWidth = columns.reduce((sum, { minWidth }) => sum + minWidth, 0);
  const paddingX = dense ? '12px' : '16px';
  const paddingY = dense ? '4px' : undefined;

  return (
    <>
      <Fade in={true} timeout={500}>
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
            ...rowStyle,
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
                  paddingLeft: paddingX,
                  paddingRight: paddingX,
                  paddingTop: paddingY,
                  paddingBottom: paddingY,
                  ...(hasOnClick && { cursor: 'pointer' }),
                  flex: `${column.width} 0 auto`,
                  minWidth: column.minWidth,
                  maxWidth: column.maxWidth,
                  width: column.width,
                  color: 'inherit',
                  fontSize: dense ? '12px' : '14px',
                  backgroundColor: column.backgroundColor,
                  fontWeight: 'normal',
                }}
              >
                <column.Cell
                  isDisabled={isDisabled}
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
      </Fade>
      <tr style={{ display: 'flex' }}>
        <td style={{ display: 'flex', flex: 1 }}>
          <Collapse
            sx={{
              flex: 1,
              '& .MuiCollapse-wrapperInner': {
                display: 'flex',
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
