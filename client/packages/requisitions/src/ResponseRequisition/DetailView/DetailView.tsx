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
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { ContentArea } from './ContentArea';
import { useResponse, ResponseLineFragment } from '../api';
import { ResponseLineEdit } from './ResponseLineEdit';

export const DetailView: FC = () => {
  const isDisabled = useResponse.utils.isDisabled();
  const { onOpen, onClose, entity, isOpen } =
    useEditModal<ResponseLineFragment>();
  const { data, isLoading } = useResponse.document.get();
  const navigate = useNavigate();
  const t = useTranslation('distribution');

  const onRowClick = useCallback(
    (line: ResponseLineFragment) => {
      onOpen(line);
    },
    [onOpen]
  );

  if (isLoading) return <DetailViewSkeleton />;

  const tabs = [
    {
      Component: <ContentArea onRowClick={!isDisabled ? onRowClick : null} />,
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
      <AppBarButtons />
      <Toolbar />
      <DetailTabs tabs={tabs} />

      <Footer />
      <SidePanel />
      {entity && (
        <ResponseLineEdit isOpen={isOpen} onClose={onClose} line={entity} />
      )}
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
