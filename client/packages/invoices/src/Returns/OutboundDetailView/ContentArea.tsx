import React, { FC } from 'react';
import {
  DataTable,
  useTranslation,
  Box,
  NothingHere,
  useUrlQueryParams,
  MiniTable,
} from '@openmsupply-client/common';
import { useExpansionColumns, useOutboundReturnColumns } from './columns';
import { OutboundReturnLineFragment } from '../api';
import { OutboundReturnItem } from '../../types';

interface ContentAreaProps {
  onAddItem: () => void;
  onRowClick?: null | ((rowData: OutboundReturnLineFragment) => void);
  rows: OutboundReturnLineFragment[];
}

const Expand: FC<{
  rowData: OutboundReturnLineFragment | OutboundReturnItem;
}> = ({ rowData }) => {
  const expandoColumns = useExpansionColumns();

  if ('lines' in rowData && rowData.lines.length > 1) {
    return <MiniTable rows={rowData.lines} columns={expandoColumns} />;
  } else {
    return null;
  }
};

export const ContentAreaComponent: FC<ContentAreaProps> = ({
  onRowClick,
  rows,
}) => {
  const t = useTranslation('distribution');
  const {
    updateSortQuery,
    queryParams: { sortBy },
  } = useUrlQueryParams();
  //   const { isGrouped } = useIsGrouped('outboundShipment');
  //   const { rows } = useOutbound.line.rows(isGrouped);
  const columns = useOutboundReturnColumns({
    onChangeSortBy: updateSortQuery,
    sortBy,
  });
  //   const isDisabled = useOutbound.utils.isDisabled();
  //   useHighlightPlaceholderRows(rows);

  if (!rows) return null;

  return (
    <Box flexDirection="column" style={{ width: '100%' }} display="flex">
      <Box flex={1} style={{ overflowY: 'auto' }}>
        <DataTable
          id="outbound-detail"
          onRowClick={onRowClick}
          ExpandContent={Expand}
          columns={columns}
          data={rows}
          enableColumnSelection
          noDataElement={
            <NothingHere
              body={t('error.no-outbound-items')}
              //   onCreate={isDisabled ? undefined : () => onAddItem()}
              buttonText={t('button.add-item')}
            />
          }
          isRowAnimated={true}
        />
      </Box>
    </Box>
  );
};

export const ContentArea = React.memo(ContentAreaComponent);
