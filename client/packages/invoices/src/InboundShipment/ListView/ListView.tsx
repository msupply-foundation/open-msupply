import React, { FC, useEffect } from 'react';
import {
  useNavigate,
  DataTable,
  useColumns,
  getNameAndColorColumn,
  TableProvider,
  createTableStore,
  InvoiceNodeStatus,
  useTranslation,
  useTableStore,
  NothingHere,
  useToggle,
  useUrlQueryParams,
  TooltipTextCell,
  GenericColumnKey,
  getCommentPopoverColumn,
  useSimplifiedTabletUI,
} from '@openmsupply-client/common';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { getStatusTranslator, isInboundListItemDisabled } from '../../utils';
import { useInbound, InboundRowFragment } from '../api';
import { Footer } from './Footer';

const useDisableInboundRows = (rows?: InboundRowFragment[]) => {
  const { setDisabledRows } = useTableStore();
  useEffect(() => {
    const disabledRows = rows
      ?.filter(isInboundListItemDisabled)
      .map(({ id }) => id);
    if (disabledRows) setDisabledRows(disabledRows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);
};
export const InboundListView: FC = () => {
  const { mutate: onUpdate } = useInbound.document.update();
  const {
    updateSortQuery,
    updatePaginationQuery,
    filter,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams({
    filters: [
      { key: 'invoiceNumber', condition: 'equalTo', isNumber: true },
      { key: 'otherPartyName' },
      {
        key: 'createdDatetime',
        condition: 'between',
      },
      { key: 'status', condition: 'equalTo' },
    ],
  });

  const pagination = { page, first, offset };
  const queryParams = { ...filter, sortBy, first, offset };

  const navigate = useNavigate();
  const invoiceModalController = useToggle();
  const linkRequestModalController = useToggle();
  const simplifiedTabletView = useSimplifiedTabletUI();

  const { data, isError, isLoading } = useInbound.document.list(queryParams);
  useDisableInboundRows(data?.nodes);

  const t = useTranslation();

  const columns = useColumns<InboundRowFragment>(
    [
      GenericColumnKey.Selection,
      [
        getNameAndColorColumn(),
        { setter: onUpdate, defaultHideOnMobile: true },
      ],
      [
        'status',
        {
          formatter: status =>
            getStatusTranslator(t)(status as InvoiceNodeStatus),
        },
      ],
      ['invoiceNumber', { maxWidth: 100 }],
      'createdDatetime',
      ['deliveredDatetime', { defaultHideOnMobile: true }],
      getCommentPopoverColumn(),
      [
        'theirReference',
        {
          Cell: TooltipTextCell,
          width: 225,
          defaultHideOnMobile: true,
        },
      ],
      [
        'totalAfterTax',
        {
          accessor: ({ rowData }) => rowData.pricing.totalAfterTax,
          defaultHideOnMobile: true,
        },
      ],
    ],
    { onChangeSortBy: updateSortQuery, sortBy },
    [sortBy]
  );

  return (
    <>
      <Toolbar filter={filter} simplifiedTabletView={simplifiedTabletView} />
      <AppBarButtons
        invoiceModalController={invoiceModalController}
        linkRequestModalController={linkRequestModalController}
        simplifiedTabletView={simplifiedTabletView}
      />
      <DataTable
        id="inbound-line-list"
        pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
        onChangePage={updatePaginationQuery}
        columns={columns}
        data={data?.nodes ?? []}
        isLoading={isLoading}
        onRowClick={row => {
          navigate(row.id);
        }}
        isError={isError}
        noDataElement={
          <NothingHere
            body={t('error.no-inbound-shipments')}
            onCreate={invoiceModalController.toggleOn}
          />
        }
        enableColumnSelection
      />
      <Footer />
    </>
  );
};

export const ListView: FC = () => (
  <TableProvider createStore={createTableStore}>
    <InboundListView />
  </TableProvider>
);
