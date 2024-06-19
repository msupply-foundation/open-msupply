import React, { useRef } from 'react';
import { RecordPatch, RecordWithId } from '@common/types';
import {
  Box,
  Column,
  HeaderRow,
  TableHead,
  TableContainer,
  TableCell,
  Table as MuiTable,
  InlineSpinner,
  NumericTextInput,
  InputAdornment,
  useTranslation,
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
  const t = useTranslation('coldchain');
  const ref = useRef<HTMLDivElement>(null);
  if (isLoading) {
    return <InlineSpinner messageKey="loading" />;
  }

  // don't show if no data
  if (!data || isError) {
    return null;
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
                      justifyContent: 'flex-end',
                    }}
                  >
                    {hasColumnText ? t('label.growth-on-previous-year') : null}
                    {columnHeader ? (
                      <NumericTextInput
                        value={columnHeader.value ?? 0}
                        decimalLimit={2}
                        decimalMin={1}
                        InputProps={{
                          inputProps: { sx: { padding: '2px 0' } },
                          endAdornment: (
                            <InputAdornment position="end">%</InputAdornment>
                          ),
                        }}
                        onChange={value => {
                          if (value !== undefined)
                            setData({
                              id: columnHeader.id,
                              value,
                            });
                        }}
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
