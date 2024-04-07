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
  createQueryParamsStore,
  DetailTabs,
} from '@openmsupply-client/common';
import {
  ItemRowWithStatsFragment,
  ActivityLogList,
} from '@openmsupply-client/system';
import { RequestLineFragment, useRequest } from '../api';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { ContentArea } from './ContentArea';
import { AppRoute } from '@openmsupply-client/config';
import { RequestLineEdit } from './RequestLineEdit';

export const DetailView: FC = () => {
  const { data, isLoading } = useRequest.document.get();
  const { onOpen, onClose, mode, entity, isOpen } =
    useEditModal<ItemRowWithStatsFragment>();
  const isDisabled = useRequest.utils.isDisabled();
  const navigate = useNavigate();
  const t = useTranslation('replenishment');

  const onRowClick = React.useCallback(
    (line: RequestLineFragment) => {
      onOpen(line.item);
    },
    [onOpen]
  );

  if (isLoading) return <DetailViewSkeleton />;

  const tabs = [
    {
      Component: (
        <ContentArea
          onRowClick={!isDisabled ? onRowClick : null}
          onAddItem={() => onOpen(null)}
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
      queryParamsStore={createQueryParamsStore<RequestLineFragment>({
        initialSortBy: { key: 'itemName' },
      })}
    >
      <AppBarButtons
        isDisabled={!data || isDisabled}
        onAddItem={() => onOpen(null)}
      />
      <Toolbar />

      <DetailTabs tabs={tabs} />

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
