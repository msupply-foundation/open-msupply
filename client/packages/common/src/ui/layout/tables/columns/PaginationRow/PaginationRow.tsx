import React, { FC } from 'react';
import { Box, Typography, Pagination, TablePagination } from '@mui/material';
import { useTranslation } from '@common/intl';
import { useLocalStorage } from '@openmsupply-client/common';
import { DEFAULT_RECORDS_PER_PAGE } from '@common/hooks';
import { useTableStore } from '../../context';

interface PaginationRowProps {
  offset: number;
  first: number;
  total: number;
  page: number;
  onChange: (page: number) => void;
}

export const PaginationRow: FC<PaginationRowProps> = ({
  page,
  offset,
  first,
  total,
  onChange,
}) => {
  const { numberSelected } = useTableStore();
  const [, setRowsPerPage] = useLocalStorage(
    '/pagination/rowsperpage',
    DEFAULT_RECORDS_PER_PAGE
  );

  // Offset is zero indexed, but should display one indexed for
  // users.
  const xToY = `${offset + 1}-${Math.min(first + offset, total)}`;

  const onChangePage = (
    _: React.ChangeEvent<unknown> | React.MouseEvent<HTMLButtonElement> | null,
    value: number
  ) => {
    // The type here is broken and `value` can be `null`!

    const isValidPage = !!value;

    if (isValidPage) {
      const zeroIndexedPageNumber = value - 1;
      onChange(zeroIndexedPageNumber);
    }
  };

  const onChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    onChangePage(event, 0);
  };

  const t = useTranslation();
  const getNumberSelectedLabel = () =>
    !!numberSelected && `(${numberSelected} ${t('label.selected')})`;

  // Pages are zero indexed. The Pagination component wants the page as
  // one-indexed.
  const displayPage = page + 1;

  return (
    <Box
      display="flex"
      flexDirection="row"
      height="48px"
      minHeight="48px"
      justifyContent="space-between"
      alignItems="center"
      boxShadow="inset 0 0.5px 0 0 rgba(143, 144, 166, 0.5)"
      padding="0px 8px 0px 20px"
    >
      {!!total && (
        <>
          <Box display="flex" flexDirection="row" flexWrap="wrap" flex={1}>
            <Typography sx={{ marginRight: '4px' }}>
              {t('label.showing')}
            </Typography>
            <Typography sx={{ fontWeight: 'bold', marginRight: '4px' }}>
              {xToY}
            </Typography>
            <Typography sx={{ marginRight: '4px' }}>{t('label.of')}</Typography>
            <Typography sx={{ fontWeight: 'bold', marginRight: '4px' }}>
              {total}
            </Typography>
            {!!numberSelected && (
              <Typography sx={{ fontWeight: 'bold', marginRight: '4px' }}>
                {getNumberSelectedLabel()}
              </Typography>
            )}
          </Box>

          <TablePagination
            size="small"
            component="div"
            page={page}
            onPageChange={onChangePage}
            rowsPerPage={first}
            onRowsPerPageChange={onChangeRowsPerPage}
            count={total}
            rowsPerPageOptions={[20, 50, 100, 500]}
            nextIconButtonProps={{ style: { display: 'none' } }}
            backIconButtonProps={{ style: { display: 'none' } }}
            labelDisplayedRows={() => null}
            labelRowsPerPage={t('label.rows-per-page')}
          />
          <Pagination
            size="small"
            page={displayPage}
            onChange={onChangePage}
            count={Math.ceil(total / first)}
            sx={{
              '& .MuiPaginationItem-root': {
                fontSize: theme => theme.typography.body1.fontSize,
              },
            }}
          />
        </>
      )}
    </Box>
  );
};
