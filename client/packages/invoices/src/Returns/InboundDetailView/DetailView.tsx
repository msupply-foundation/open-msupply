import React, { FC } from 'react';
import {
  TableProvider,
  createTableStore,
  DetailViewSkeleton,
  AlertModal,
  useNavigate,
  RouteBuilder,
  useTranslation,
  createQueryParamsStore,
  DetailTabs,
} from '@openmsupply-client/common';
import { ContentArea } from './ContentArea';
// import { Toolbar } from './Toolbar';
// import { AppBarButtons } from './AppBarButtons';
import { InboundReturnDetailRowFragment, useReturns } from '../api';
import { AppRoute } from '@openmsupply-client/config';

export const InboundReturnDetailView: FC = () => {
  const { data, isLoading } = useReturns.document.inboundReturn();
  const t = useTranslation('distribution');
  const navigate = useNavigate();

  const onRowClick = () => {};

  const onAddItem = () => {};

  if (isLoading) return <DetailViewSkeleton hasGroupBy={true} hasHold={true} />;

  const tabs = [
    {
      Component: (
        <ContentArea
          onRowClick={onRowClick}
          onAddItem={onAddItem}
          rows={data?.lines?.nodes ?? []}
        />
      ),
      value: 'Details',
    },
    {
      Component: <p>To-do</p>,
      value: 'Log',
    },
  ];

  return (
    <React.Suspense
      fallback={<DetailViewSkeleton hasGroupBy={true} hasHold={true} />}
    >
      {data ? (
        <TableProvider
          createStore={createTableStore}
          queryParamsStore={createQueryParamsStore<InboundReturnDetailRowFragment>(
            {
              initialSortBy: {
                key: 'itemName',
              },
            }
          )}
        >
          {/* <AppBarButtons onAddItem={onAddItem} /> */}

          {/* <Toolbar /> */}
          <DetailTabs tabs={tabs} />
        </TableProvider>
      ) : (
        <AlertModal
          open={true}
          onOk={() =>
            navigate(
              RouteBuilder.create(AppRoute.Distribution)
                .addPart(AppRoute.InboundReturn)
                .build()
            )
          }
          title={t('error.return-not-found')}
          message={t('messages.click-to-return-to-inbound-returns')}
        />
      )}
    </React.Suspense>
  );
};
