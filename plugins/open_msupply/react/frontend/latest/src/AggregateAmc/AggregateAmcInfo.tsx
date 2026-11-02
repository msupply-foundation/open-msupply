import {
  ArrayElement,
  Box,
  MaterialTable,
  Plugins,
  QueryClientProviderProxy,
  RecordWithId,
  TextWithTooltipCell,
  useSimpleMaterialTable,
  ColumnDef,
  usePluginGraphql,
} from '@openmsupply-client/common';
import { Graphql } from '../../../../shared/types';
import { name as pluginCode } from '../../package.json';
import React from 'react';

type RequestLineEditInfo = ArrayElement<
  NonNullable<Plugins['requestRequisitionLine']>['editViewInfo']
>;

type Stat = ArrayElement<
  Extract<Graphql['output'], { type: 'aggregateAmc' }>['stats']
>;
type ColumnData = Stat & RecordWithId;

const ItemInformation: RequestLineEditInfo = ({ line }) => {
  const { data } = usePluginGraphql<Graphql['input'], Graphql['output']>(
    line.id,
    pluginCode,
    {
      type: 'aggregateAmc',
      itemIds: [line.itemId],
    }
  );

  const columns: ColumnDef<ColumnData>[] = [
    {
      id: 'name',
      enableSorting: false,
      header: 'Name',
      accessorFn: row => row.name,
      size: 240,
      Cell: TextWithTooltipCell,
    },
    {
      id: 'amc',
      enableSorting: false,
      header: 'AMC',
      accessorFn: row => row.amc,
      size: 100,
      Cell: TextWithTooltipCell,
    },
  ];

  if (data && data?.type != 'aggregateAmc') {
    throw new Error('Unexpected api result, should return aggregateAmc type');
  }

  const tableData = (data?.stats ?? []).map(row => ({ ...row, id: row.name }));

  const table = useSimpleMaterialTable({
    tableId: 'item-information',
    columns,
    data: tableData,
    initialState: {
      density: 'compact',
    },
  });

  return <MaterialTable table={table} />;
};

const ItemInformationView: RequestLineEditInfo = props => (
  <Box
    width="100%"
    borderRadius={3}
    sx={{
      display: 'flex',
      flex: '1 1 0%',
      overflowY: 'auto',
    }}
  >
    <ItemInformation {...props} />
  </Box>
);

export const Info: RequestLineEditInfo = ({ ...props }) => (
  <QueryClientProviderProxy>
    <ItemInformationView {...props} />
  </QueryClientProviderProxy>
);
