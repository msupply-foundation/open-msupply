import React, { useRef } from 'react';
import { RecordPatch, RecordWithId } from '@common/types';
import {
  BasicTextInput,
  Box,
  Column,
  HeaderRow,
  TableHead,
  TableContainer,
  TableCell,
  Table as MuiTable,
  NothingHere,
  InlineSpinner,
} from '@openmsupply-client/common';
import { HeaderData, HeaderValue } from '../types';

interface GrowthRowProps<T extends RecordWithId> {
  columns: Column<T>[];
  isError?: boolean;
  isLoading?: boolean;
  data?: HeaderData;
  setData: (patch: RecordPatch<HeaderValue>) => void;
  overflowX?:
    | 'auto'
    | 'hidden'
    | 'visible'
    | 'scroll'
    | 'inherit'
    | 'initial'
    | 'unset';
}
export const GrowthRow = <T extends RecordWithId>({
  columns,
  isError = false,
  isLoading = false,
  overflowX = 'unset',
  data,
  setData,
}: GrowthRowProps<T>) => {
  const ref = useRef<HTMLDivElement>(null);
  if (isLoading) {
    return <InlineSpinner messageKey="loading" />;
  }

  // don't show if no data
  if (!data || isError) {
    return <NothingHere />;
  }

  return (
    <TableContainer
      ref={ref}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        overflowX,
        overflowY: 'auto',
      }}
    >
      <MuiTable>
        <TableHead
          sx={{
            backgroundColor: 'background.white',
            position: 'sticky',
            top: 0,
            zIndex: 'tableHeader',
          }}
        >
          <HeaderRow>
            {columns.map(column => {
              const { align, width } = column;
              const columnHeader = Object.values(data).filter(
                header => (header as HeaderValue).id === column.key
              )[0] as HeaderValue;
              const hasColumnText = column.key === '0';
              return (
                <TableCell
                  key={String(column.key)}
                  role="columnheader"
                  align={align}
                  padding={'none'}
                  sx={{
                    backgroundColor: 'transparent',
                    borderBottom: '0px',
                    paddingLeft: '16px',
                    paddingRight: '16px',
                    width,
                    fontWeight: 'bold',
                    verticalAlign: 'bottom',
                  }}
                  aria-label={String(column.key)}
                >
                  <Box
                    sx={{
                      flexDirection: 'row',
                      borderBottom: 'none',
                      alignItems: 'center',
                      display: 'flex',
                    }}
                  >
                    {hasColumnText ? <>% Growth on previous year</> : null}
                    {columnHeader ? (
                      <BasicTextInput
                        defaultValue={columnHeader.value ?? 0}
                        onBlur={e =>
                          setData({
                            id: columnHeader.id,
                            value: Number(e.target.value),
                          })
                        }
                      />
                    ) : null}
                  </Box>
                </TableCell>
              );
            })}
          </HeaderRow>
        </TableHead>
      </MuiTable>
    </TableContainer>
  );
};
