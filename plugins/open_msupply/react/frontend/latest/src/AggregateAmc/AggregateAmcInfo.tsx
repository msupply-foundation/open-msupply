import {
  ArrayElement,
  Box,
  createTableStore,
  DataTable,
  Plugins,
  QueryClientProviderProxy,
  RecordWithId,
  TableProvider,
  TooltipTextCell,
  useColumns,
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

  const columns = useColumns<ColumnData>([
    {
      key: 'name',
      sortable: false,
      label: 'Name',
      accessor: ({ rowData }) => rowData.name,
      width: 240,
      Cell: TooltipTextCell,
    },
    {
      key: 'amc',
      sortable: false,
      label: 'AMC',
      accessor: ({ rowData }) => rowData.amc,
      width: 100,
      Cell: TooltipTextCell,
    },
  ]);

  if (data && data?.type != 'aggregateAmc') {
    throw new Error('Unexpected api result, should return aggregateAmc type');
  }

  const tableData = (data?.stats ?? []).map(row => ({ ...row, id: row.name }));

  return (
    <DataTable id="item-information" columns={columns} data={tableData} dense />
  );
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
    <TableProvider createStore={createTableStore}>
      <ItemInformation {...props} />
    </TableProvider>
  </Box>
);

export const Info: RequestLineEditInfo = ({ ...props }) => (
  <QueryClientProviderProxy>
    <ItemInformationView {...props} />
  </QueryClientProviderProxy>
);
