import React, { FC } from 'react';
import {
  TableProvider,
  createTableStore,
  DetailViewSkeleton,
  useNavigate,
  useTranslation,
  AlertModal,
  RouteBuilder,
  useEditModal,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { ItemRowFragment } from '@openmsupply-client/system';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { ContentArea } from './ContentArea';
import {
  useResponseRequisition,
  ResponseRequisitionLineFragment,
} from '../api';
import { ResponseLineEdit } from './ResponseLineEdit';

export const DetailView: FC = () => {
  const { onOpen, onClose, mode, entity, isOpen } =
    useEditModal<ItemRowFragment>();
  const { data, isLoading } = useResponseRequisition();
  const navigate = useNavigate();
  const t = useTranslation('distribution');

  const onRowClick = React.useCallback(
    (line: ResponseRequisitionLineFragment) => {
      onOpen(line.item);
    },
    [onOpen]
  );

  if (isLoading) return <DetailViewSkeleton />;

  return !!data ? (
    <TableProvider createStore={createTableStore}>
      <AppBarButtons onAddItem={() => onOpen(null)} />
      <Toolbar />
      <ContentArea onRowClick={onRowClick} />
      <Footer />
      <SidePanel />
      {isOpen && (
        <ResponseLineEdit
          isOpen={isOpen}
          onClose={onClose}
          mode={mode}
          item={entity}
        />
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
