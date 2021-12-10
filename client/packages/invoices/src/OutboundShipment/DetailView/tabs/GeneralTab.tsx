import React, { FC } from 'react';
import {
  DataTable,
  ObjectWithStringKeys,
  usePagination,
  Column,
  DomainObject,
  Box,
  useTranslation,
  Grid,
  useToggle,
  useFormatDate,
  useFormatNumber,
  Table,
  TableCell,
  TableHead,
  TableBody,
  TableRow,
  Switch,
  LocationNode,
  NodeError,
  alpha,
} from '@openmsupply-client/common';
import { OutboundShipmentSummaryItem } from '../../../types';

interface GeneralTabProps<T extends ObjectWithStringKeys & DomainObject> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (rowData: T) => void;
}

const HeaderCell: React.FC = ({ children }) => (
  <TableCell
    sx={{
      color: theme => theme.typography.body1.color,
      fontWeight: 'bold',
      padding: '8px',
      fontSize: '12px',
    }}
  >
    {children}
  </TableCell>
);

const Cell: React.FC = ({ children }) => (
  <TableCell
    sx={{
      color: theme => theme.typography.body1.color,
      padding: '8px',
      fontSize: '12px',
    }}
  >
    {children}
  </TableCell>
);

const locationGuard = (
  location: LocationNode | NodeError
): LocationNode | undefined => {
  if (location?.__typename === 'LocationNode') {
    return location;
  }
  return undefined;
};

const Expand: FC<{
  rowData: OutboundShipmentSummaryItem;
}> = ({ rowData }) => {
  const t = useTranslation();
  const d = useFormatDate();
  const n = useFormatNumber();

  if (!rowData?.canExpand) return <></>;

  return (
    <Box p={1} style={{ padding: '0 50px 0 200px' }}>
      <Box
        flex={1}
        display="flex"
        height="100%"
        borderRadius={4}
        sx={{
          backgroundColor: theme => alpha(theme.palette['gray']['light'], 0.4),
        }}
      >
        <Table style={{ fontSize: 12 }}>
          <TableHead>
            <TableRow>
              <HeaderCell>{t('label.batch')}</HeaderCell>
              <HeaderCell>{t('label.expiry')}</HeaderCell>
              <HeaderCell>{t('label.location')}</HeaderCell>
              <HeaderCell>{t('label.sell')}</HeaderCell>
              <HeaderCell>{t('label.pack-size')}</HeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.keys(rowData.batches).map(key => {
              const batch = rowData.batches[key];
              return (
                <TableRow key={batch.id}>
                  <Cell>{batch.batch}</Cell>
                  <Cell>{d(new Date(batch.expiryDate))}</Cell>
                  <Cell>{locationGuard(batch.location)?.name}</Cell>
                  <Cell>{`$${n(Number(batch.sellPricePerPack))}`}</Cell>
                  <Cell>{batch.packSize}</Cell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
};

export const GeneralTabComponent: FC<
  GeneralTabProps<OutboundShipmentSummaryItem>
> = ({ data, columns, onRowClick }) => {
  const { pagination } = usePagination();
  const { isOn, toggle } = useToggle();

  const paged = data.slice(
    pagination.offset,
    pagination.offset + pagination.first
  );
  const [batched, setBatched] = React.useState<OutboundShipmentSummaryItem[]>(
    []
  );

  React.useEffect(() => {
    if (isOn) {
      setBatched(
        paged.map(row => ({
          ...row,
          canExpand: Object.keys(row.batches).length > 1,
        }))
      );
    } else {
      const unBatched: OutboundShipmentSummaryItem[] = [];
      paged.forEach(row => {
        Object.values(row.batches).forEach(batch => {
          unBatched.push({
            ...row,
            batch: batch.batch,
            // expiryDate: batch.expiryDate,
            // location: batch.locationName,
            // sellPricePerPack: batch.sellPricePerPack,
            packSize: batch.packSize,
            canExpand: false,
          });
        });
      });
      setBatched(unBatched);
    }
  }, [isOn, data]);
  const t = useTranslation('distribution');
  const activeRows = data.filter(({ isDeleted }) => !isDeleted);
  console.info('****');
  console.info('*BATCHED*', batched);
  console.info('****');
  return (
    <Grid container flexDirection="column" flexWrap="nowrap">
      <Grid
        item
        justifyContent="flex-end"
        display="flex"
        flex={0}
        sx={{ padding: '5px', paddingRight: '15px', width: '100%' }}
      >
        <Switch
          label={t('label.group-by-item')}
          onChange={toggle}
          checked={isOn}
          size="small"
          disabled={batched.length === 0}
        />
      </Grid>
      <Grid item>
        <DataTable
          onRowClick={onRowClick}
          ExpandContent={Expand}
          pagination={{ ...pagination, total: activeRows.length }}
          columns={columns}
          data={batched}
          onChangePage={pagination.onChangePage}
          noDataMessage={t('error.no-items')}
        />
      </Grid>
    </Grid>
  );
};

export const GeneralTab = React.memo(GeneralTabComponent);
