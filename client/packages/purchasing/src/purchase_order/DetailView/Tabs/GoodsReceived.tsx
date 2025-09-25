import React from 'react';
import {
  ColumnAlign,
  ColumnFormat,
  DataTable,
  NothingHere,
  useColumns,
  useNavigate,
  useParams,
  useTranslation,
  RouteBuilder,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import {
  useGoodsReceivedList,
  GoodsReceivedRowFragment,
} from '../../../goods_received/api';

export const GoodsReceived = () => {
  const t = useTranslation();
  const { purchaseOrderId } = useParams();
  const navigate = useNavigate();

  const {
    query: { data, isError, isLoading },
  } = useGoodsReceivedList({
    filterBy: { purchaseOrderId: { equalTo: purchaseOrderId } },
  });

  const columns = useColumns<GoodsReceivedRowFragment>([
    {
      key: 'number',
      label: 'label.number',
      accessor: ({ rowData }) => rowData.number,
      align: ColumnAlign.Right,
    },
    {
      key: 'supplier',
      label: 'label.supplier',
      accessor: ({ rowData }) => rowData.supplier?.name,
    },
    {
      key: 'status',
      label: 'label.status',
      accessor: ({ rowData }) => rowData.status,
    },
    {
      key: 'supplierReference',
      label: 'label.supplier-reference',
      accessor: ({ rowData }) => rowData.supplierReference,
    },
    {
      key: 'createdDateTime',
      label: 'label.created-datetime',
      format: ColumnFormat.Date,
      accessor: ({ rowData }) => rowData.createdDatetime,
    },
    {
      key: 'receivedDateTime',
      label: 'label.received-date',
      format: ColumnFormat.Date,
      accessor: ({ rowData }) => rowData.receivedDatetime,
    },
  ]);

  const handleRowClick = (row: GoodsReceivedRowFragment) => {
    const path = RouteBuilder.create(AppRoute.Replenishment)
      .addPart(AppRoute.GoodsReceived)
      .addPart(row.id)
      .build();
    navigate(path);
  };

  return (
    <DataTable
      id="goods-received-linked-table"
      columns={columns}
      enableColumnSelection
      data={data?.nodes ?? []}
      isError={isError}
      isLoading={isLoading}
      onRowClick={handleRowClick}
      noDataElement={<NothingHere body={t('error.no-goods-received-linked')} />}
    />
  );
};
