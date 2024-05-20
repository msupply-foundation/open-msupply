import { RecordPatch, RecordWithId } from '@common/types';
import { BasicTextInput, Box, HeaderRow } from 'packages/common/src';
import { Column } from 'packages/common/src/ui/layout/tables/columns/types';
import { HeaderValue } from './IndicatorsDemographics';
import React, { useRef } from 'react';
import {
  TableHead,
  TableContainer,
  Table as MuiTable,
  TableCell,
} from '@mui/material';

interface GrowthRowProps<T extends RecordWithId> {
  columns: Column<T>[];
  isError?: boolean;
  isLoading?: boolean;
  data: Record<string, HeaderValue>;
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

  // don't show if no data
  if (!data || isLoading || isError) {
    return <></>;
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
            // boxShadow: dense ? null : theme => theme.shadows[2],
          }}
        >
          <HeaderRow>
            {/* <TableCell
              key={String('year')}
              role="columnheader"
              align={align}
              padding={'none'}
              sx={{
                backgroundColor: 'transparent',
                borderBottom: '0px',
                paddingLeft: '16px',
                paddingRight: '16px',
                width,
                // minWidth,
                // maxWidth,
                fontWeight: 'bold',
                // fontSize: dense ? '12px' : '14px',
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
                {columnHeader && columnHeader.value && columnHeader.id ? (
                  <BasicTextInput
                    defaultValue={columnHeader.value}
                    onBlur={e =>
                      setData({
                        id: columnHeader.id,
                        value: Number(e.target.value),
                      })
                    }
                  />
                ) : (
                  <></>
                )}
              </Box>
            </TableCell> */}
            {columns.map(column => {
              const { align, width } = column;
              const columnHeader = Object.values(data).filter(
                header => header.id == column.key
              )[0];
              return (
                // <TableCell ></TableCell>
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
                    // minWidth,
                    // maxWidth,
                    fontWeight: 'bold',
                    // fontSize: dense ? '12px' : '14px',
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
                    ) : (
                      <></>
                    )}
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
