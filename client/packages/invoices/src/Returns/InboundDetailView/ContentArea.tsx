import React, { FC } from 'react';
import {
  DataTable,
  useTranslation,
  Box,
  NothingHere,
  useUrlQueryParams,
  MiniTable,
} from '@openmsupply-client/common';
import { useExpansionColumns, useInboundReturnColumns } from './columns';
import { InboundReturnLineFragment, useReturns } from '../api';
import { InboundReturnItem } from '../../types';

interface ContentAreaProps {
  onAddItem: () => void;
  onRowClick?:
    | null
    | ((rowData: InboundReturnLineFragment | InboundReturnItem) => void);
}

const Expand: FC<{
  rowData: InboundReturnLineFragment | InboundReturnItem;
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
  onAddItem,
}) => {
  const t = useTranslation('distribution');
  const {
    updateSortQuery,
    queryParams: { sortBy },
  } = useUrlQueryParams();
  const { rows } = useReturns.lines.inboundReturnRows();
  const columns = useInboundReturnColumns({
    onChangeSortBy: updateSortQuery,
    sortBy,
  });
  //   const isDisabled = useOutbound.utils.isDisabled();

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
              onCreate={() => onAddItem()}
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
