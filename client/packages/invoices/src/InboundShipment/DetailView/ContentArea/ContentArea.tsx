import React, { FC } from 'react';
import {
  DataTable,
  useTranslation,
  Box,
  Switch,
  MiniTable,
  NothingHere,
} from '@openmsupply-client/common';
import { InboundItem } from '../../../types';
import { useInboundRows, InboundLineFragment } from '../../api';
import { useExpansionColumns } from './columns';

interface ContentAreaProps {
  onAddItem: () => void;
  onRowClick?: null | ((rowData: InboundLineFragment | InboundItem) => void);
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

export const ContentArea: FC<ContentAreaProps> = React.memo(
  ({ onAddItem, onRowClick }) => {
    const t = useTranslation('replenishment');
    const { columns, rows, isGrouped, toggleIsGrouped } = useInboundRows();

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
          columns={columns}
          data={rows}
          noDataElement={
            <NothingHere
              body={t('error.no-inbound-items')}
              onCreate={onAddItem}
              buttonText={t('button.add-item')}
            />
          }
        />
      </Box>
    );
  }
);
