import React, { FC } from 'react';
import {
  DataTable,
  useTranslation,
  Box,
  //   MiniTable,
  //   useIsGrouped,
  //   InvoiceLineNodeType,
  //   useRowStyle,
  //   AppSxProp,
  NothingHere,
  useUrlQueryParams,
} from '@openmsupply-client/common';
// import { useOutbound } from '../api';
import { useOutboundReturnColumns } from './columns';
import { OutboundReturnDetailRowFragment } from '../api';
// import { useExpansionColumns } from './OutboundLineEdit/columns';

interface ContentAreaProps {
  onAddItem: () => void;
  onRowClick?: null | ((rowData: OutboundReturnDetailRowFragment) => void);
  rows: OutboundReturnDetailRowFragment[];
}

// const Expand: FC<{
//   rowData: StockOutLineFragment | StockOutItem;
// }> = ({ rowData }) => {
//   const expandoColumns = useExpansionColumns();

//   if ('lines' in rowData && rowData.lines.length > 1) {
//     return <MiniTable rows={rowData.lines} columns={expandoColumns} />;
//   } else {
//     return null;
//   }
// };

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
          //   ExpandContent={Expand}
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
