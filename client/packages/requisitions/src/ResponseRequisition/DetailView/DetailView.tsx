import React, { FC, useCallback } from 'react';
import {
  TableProvider,
  createTableStore,
  DetailViewSkeleton,
  useNavigate,
  useTranslation,
  AlertModal,
  RouteBuilder,
  useEditModal,
  createQueryParamsStore,
  DetailTabs,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { ActivityLogList } from '@openmsupply-client/system';
import { Toolbar } from './Toolbar/Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { ContentArea } from './ContentArea';
import { useResponse, ResponseLineFragment } from '../api';

export const DetailView: FC = () => {
  const t = useTranslation();
  const { data, isLoading } = useResponse.document.get();
  const isDisabled = useResponse.utils.isDisabled();
  const { onOpen } = useEditModal<ResponseLineFragment>();
  const navigate = useNavigate();

  const onRowClick = useCallback(
    (line: ResponseLineFragment) => {
      onOpen(line);
    },
    [onOpen]
  );

  if (isLoading) return <DetailViewSkeleton />;

  const tabs = [
    {
      Component: (
        <ContentArea
          onAddItem={() => onOpen(null)}
          onRowClick={!isDisabled ? onRowClick : null}
          disableAddLine={
            isDisabled || !!data?.linkedRequisition || !!data?.programName
          }
        />
      ),
      value: 'Details',
    },
    {
      Component: <ActivityLogList recordId={data?.id ?? ''} />,
      value: 'Log',
    },
  ];

  return !!data ? (
    <TableProvider
      createStore={createTableStore}
      queryParamsStore={createQueryParamsStore<ResponseLineFragment>({
        initialSortBy: { key: 'itemName' },
      })}
    >
      <AppBarButtons
        isDisabled={isDisabled}
        hasLinkedRequisition={!!data.linkedRequisition}
        isProgram={!!data.programName}
        onAddItem={() => onOpen(null)}
      />
      <Toolbar />
      <DetailTabs tabs={tabs} />

      <Footer />
      <SidePanel />
    </TableProvider>
  ) : (
    <AlertModal
      open={true}
      onOk={() =>
        navigate(
          RouteBuilder.create(AppRoute.Distribution)
            .addPart(AppRoute.CustomerRequisition)
            .build()
        )
      }
      title={t('error.requisition-not-found')}
      message={t('messages.click-to-return-to-requisitions')}
    />
  );
};
