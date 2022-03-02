import React, { FC, useMemo } from 'react';
import {
  DataTable,
  usePagination,
  RecordWithId,
  useTranslation,
  useIsGrouped,
  Box,
  Switch,
  MiniTable,
} from '@openmsupply-client/common';
import { InboundItem } from '../../types';
import { useInboundItems, useInboundLines, InboundLineFragment } from '../api';
import { useExpansionColumns, useInboundShipmentColumns } from './columns';

interface GeneralTabProps<T extends RecordWithId> {
  onRowClick?: (rowData: T) => void;
}

const Expando = ({
  rowData,
}: {
  rowData: InboundLineFragment | InboundItem;
}) => {
  const expandoColumns = useExpansionColumns();
  if ('lines' in rowData && rowData.lines.length > 1) {
    return <MiniTable rows={rowData.lines} columns={expandoColumns} />;
  } else {
    return null;
  }
};

export const GeneralTab: FC<
  GeneralTabProps<InboundItem | InboundLineFragment>
> = React.memo(({ onRowClick }) => {
  const { pagination } = usePagination();
  const t = useTranslation('replenishment');
  const columns = useInboundShipmentColumns();
  const lines = useInboundLines();
  const { data: items } = useInboundItems();
  const { isGrouped, toggleIsGrouped } = useIsGrouped('inboundShipment');
  const rows = isGrouped ? items : lines;

  const paged = useMemo(
    () => rows?.slice(pagination.offset, pagination.offset + pagination.first),
    [rows, pagination.offset, pagination.first]
  );

  return (
    <Box flexDirection="column" display="flex" flex={1}>
      {rows?.length !== 0 && (
        <Box style={{ padding: 5, marginInlineStart: 15 }}>
          <Switch
            label={t('label.group-by-item')}
            onChange={toggleIsGrouped}
            checked={isGrouped}
            size="small"
            disabled={rows?.length === 0}
            color="secondary"
          />
        </Box>
      )}
      <DataTable
        onRowClick={onRowClick}
        ExpandContent={Expando}
        pagination={{ ...pagination, total: rows?.length }}
        columns={columns}
        data={paged}
        onChangePage={pagination.onChangePage}
        noDataMessage={t('error.no-items')}
      />
    </Box>
  );
});
