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
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { ContentArea } from './ContentArea';
import {
  useIsResponseDisabled,
  useResponse,
  ResponseLineFragment,
} from '../api';
import { ResponseLineEdit } from './ResponseLineEdit';

export const DetailView: FC = () => {
  const isDisabled = useIsResponseDisabled();
  const { onOpen, onClose, entity, isOpen } =
    useEditModal<ResponseLineFragment>();
  const { data, isLoading } = useResponse();
  const navigate = useNavigate();
  const t = useTranslation('distribution');

  const onRowClick = useCallback(
    (line: ResponseLineFragment) => {
      onOpen(line);
    },
    [onOpen]
  );

  if (isLoading) return <DetailViewSkeleton />;

  return !!data ? (
    <TableProvider
      createStore={createTableStore}
      queryParamsStore={createQueryParamsStore<ResponseLineFragment>({
        initialSortBy: { key: 'itemName' },
      })}
    >
      <AppBarButtons />
      <Toolbar />
      <ContentArea onRowClick={!isDisabled ? onRowClick : null} />
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
