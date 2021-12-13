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
  Switch,
  alpha,
  useColumns,
  ifTheSameElseDefault,
} from '@openmsupply-client/common';
import { OutboundShipmentSummaryItem } from '../../../types';

interface GeneralTabProps<T extends ObjectWithStringKeys & DomainObject> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (rowData: T) => void;
}

const Expand: FC<{
  rowData: OutboundShipmentSummaryItem;
}> = ({ rowData }) => {
  const t = useTranslation();

  const columns = useColumns([
    'batch',
    'expiryDate',
    'locationName',
    'sellPricePerPack',
    'packSize',
    'itemUnit',
    'unitQuantity',
    'numberOfPacks',
  ]);

  const batches = Object.values(rowData.batches).map(batch => ({
    ...batch,
    unitQuantity: batch.numberOfPacks * batch.packSize,
  }));
  const BatchTable = React.useMemo(
    () => (
      <DataTable
        dense
        columns={columns}
        data={batches}
        noDataMessage={t('error.no-items')}
      />
    ),
    []
  );

  if (!rowData?.canExpand) return <></>;

  return (
    <Box p={1} style={{ padding: '0 50px 0 200px' }}>
      <Box
        flex={1}
        display="flex"
        height="100%"
        borderRadius={4}
        sx={{
          backgroundColor: theme => alpha(theme.palette['gray']['light'], 0.2),
        }}
      >
        {BatchTable}
      </Box>
    </Box>
  );
};

export const GeneralTabComponent: FC<
  GeneralTabProps<OutboundShipmentSummaryItem>
> = ({ data, columns, onRowClick }) => {
  const { pagination } = usePagination();
  const { isOn, toggle } = useToggle();

  const [grouped, setGrouped] = React.useState<OutboundShipmentSummaryItem[]>(
    []
  );
  const paged = data.slice(
    pagination.offset,
    pagination.offset + pagination.first
  );

  React.useEffect(() => {
    if (isOn) {
      setGrouped(
        paged.map(row => {
          const batches = Object.values(row.batches);
          return {
            ...row,
            batch: ifTheSameElseDefault(batches, 'batch', '[multiple]'),
            expiryDate: ifTheSameElseDefault(
              batches,
              'expiryDate',
              '[multiple]'
            ),
            canExpand: Object.keys(row.batches).length > 1,
          };
        })
      );
    } else {
      const unGrouped: OutboundShipmentSummaryItem[] = [];
      paged.forEach(row => {
        Object.values(row.batches).forEach(batch => {
          unGrouped.push({
            ...row,
            batch: batch.batch,
            expiryDate: batch.expiryDate,
            packSize: batch.packSize,
            canExpand: false,
          });
        });
      });
      setGrouped(unGrouped);
    }
  }, [isOn, data]);
  const t = useTranslation('distribution');
  const activeRows = grouped.filter(({ isDeleted }) => !isDeleted);

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
          disabled={grouped.length === 0}
        />
      </Grid>
      <Grid item>
        <DataTable
          onRowClick={onRowClick}
          ExpandContent={Expand}
          pagination={{ ...pagination, total: activeRows.length }}
          columns={columns}
          data={grouped}
          onChangePage={pagination.onChangePage}
          noDataMessage={t('error.no-items')}
        />
      </Grid>
    </Grid>
  );
};

export const GeneralTab = React.memo(GeneralTabComponent);
