import React, { FC } from 'react';
import {
  TableProvider,
  createTableStore,
  DetailViewSkeleton,
  AlertModal,
  RouteBuilder,
  useNavigate,
  useTranslation,
  useEditModal,
} from '@openmsupply-client/common';
import { ItemRowWithStatsFragment } from '@openmsupply-client/system';
import { RequestLineFragment, useRequest, useIsRequestDisabled } from '../api';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { ContentArea } from './ContentArea';
import { AppRoute } from '@openmsupply-client/config';
import { RequestLineEdit } from './RequestLineEdit';

export const DetailView: FC = () => {
  const { data, isLoading } = useRequest();
  const { onOpen, onClose, mode, entity, isOpen } =
    useEditModal<ItemRowWithStatsFragment>();
  const isDisabled = useIsRequestDisabled();
  const navigate = useNavigate();
  const t = useTranslation('replenishment');

  const onRowClick = React.useCallback(
    (line: RequestLineFragment) => {
      onOpen(line.item);
    },
    [onOpen]
  );

  if (isLoading) return <DetailViewSkeleton />;

  return !!data ? (
    <TableProvider createStore={createTableStore}>
      <AppBarButtons
        isDisabled={!data || isDisabled}
        onAddItem={() => onOpen(null)}
      />
      <Toolbar />
      <ContentArea
        onRowClick={!isDisabled ? onRowClick : null}
        onAddItem={() => onOpen(null)}
      />
      <Footer />
      <SidePanel />
      {isOpen && (
        <RequestLineEdit
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
          RouteBuilder.create(AppRoute.Replenishment)
            .addPart(AppRoute.InternalOrder)
            .build()
        )
      }
      title={t('error.requisition-not-found')}
      message={t('messages.click-to-return-to-requisitions')}
    />
  );
};
