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
import { OutboundReturnLineFragment, useReturns } from '../api';
import { OutboundReturnItem } from '../../types';

interface ContentAreaProps {
  onAddItem: () => void;
  onRowClick?:
    | null
    | ((rowData: OutboundReturnLineFragment | OutboundReturnItem) => void);
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
  onAddItem,
}) => {
  const t = useTranslation('distribution');
  const {
    updateSortQuery,
    queryParams: { sortBy },
  } = useUrlQueryParams();

  const { rows } = useReturns.lines.outboundReturnRows();
  const columns = useOutboundReturnColumns({
    onChangeSortBy: updateSortQuery,
    sortBy,
  });
  const isDisabled = useReturns.utils.outboundIsDisabled();
  //   useHighlightPlaceholderRows(rows);

  if (!rows) return null;

  return (
    <Box flexDirection="column" display="flex" flex={1}>
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
            onCreate={isDisabled ? undefined : () => onAddItem()}
            buttonText={t('button.add-item')}
          />
        }
        isRowAnimated={true}
      />
    </Box>
  );
};

export const ContentArea = React.memo(ContentAreaComponent);
