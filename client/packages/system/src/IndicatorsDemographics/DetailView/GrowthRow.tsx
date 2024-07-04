import React, { useRef } from 'react';
import { RecordWithId } from '@common/types';
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
  useBufferState,
} from '@openmsupply-client/common';
import { HeaderData } from '../types';
import { isHeaderDataYearKey } from './utils';

interface GrowthRowProps<T extends RecordWithId> {
  columns: Column<T>[];
  isError?: boolean;
  isLoading?: boolean;
  data?: HeaderData;
  setData: (updatedHeader: HeaderData) => void;
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
              const key = Number(column.key);

              const columnHeader = isHeaderDataYearKey(key) ? data[key] : null;
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
                      <GrowthInput
                        value={columnHeader.value}
                        setValue={value =>
                          setData({
                            ...data,
                            [columnHeader.id]: {
                              id: columnHeader.id,
                              value,
                            },
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

const GrowthInput = ({
  value,
  setValue,
}: {
  value?: number;
  setValue: (x: number) => void;
}) => {
  const [buffer, setBuffer] = useBufferState(value);

  return (
    <NumericTextInput
      value={buffer}
      decimalLimit={4}
      decimalMin={1}
      allowNegative
      endAdornment="%"
      onChange={newValue => {
        setBuffer(newValue);
        if (newValue !== undefined) setValue(newValue);
      }}
    />
  );
};
