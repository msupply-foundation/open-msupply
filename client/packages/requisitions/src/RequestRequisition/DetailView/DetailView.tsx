import React, { FC, useCallback, useEffect, useState } from 'react';
import {
  TableProvider,
  createTableStore,
  DetailViewSkeleton,
  AlertModal,
  RouteBuilder,
  useNavigate,
  useTranslation,
  createQueryParamsStore,
  DetailTabs,
  useAuthContext,
  useBreadcrumbs,
  useEditModal,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { ActivityLogList, ItemRowFragment } from '@openmsupply-client/system';

import { RequestLineFragment, useRequest } from '../api';
import { RequestRequisitionLineErrorProvider } from '../context';

import { Footer } from './Footer';
import { Toolbar } from './Toolbar';
import { SidePanel } from './SidePanel';
import { ContentArea } from './ContentArea';
import { IndicatorsTab } from './IndicatorsTab';
import { AppBarButtons } from './AppBarButtons';
import { buildIndicatorEditRoute } from './utils';
import { RequestLineEditModal } from './RequestLineEdit';

export const DetailView: FC = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const [selectedItemId, setSelectedItemId] = useState<string>();

  const { store } = useAuthContext();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const { onOpen, onClose, isOpen } = useEditModal<ItemRowFragment>();

  const isDisabled = useRequest.utils.isDisabled();
  const { data, isLoading } = useRequest.document.get();
  const { data: programIndicators, isLoading: isProgramIndicatorsLoading } =
    useRequest.document.indicators(
      store?.nameId ?? '',
      data?.period?.id ?? '',
      data?.program?.id ?? '',
      !!data
    );

  const handleProgramIndicatorClick = useCallback(
    (
      requisitionId?: string,
      programIndicatorCode?: string,
      indicatorId?: string
    ) => {
      if (!requisitionId || !programIndicatorCode || !indicatorId) return;

      navigate(
        buildIndicatorEditRoute(
          requisitionId,
          programIndicatorCode,
          indicatorId
        )
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleRowClick = (line: RequestLineFragment) => {
    setSelectedItemId(line.item.id);
    onOpen();
  };

  const handleAddItem = () => {
    setSelectedItemId('new');
    onOpen();
  };

  const tabs = [
    {
      Component: (
        <ContentArea onRowClick={handleRowClick} onAddItem={handleAddItem} />
      ),
      value: 'Details',
    },
    {
      Component: <ActivityLogList recordId={data?.id ?? ''} />,
      value: 'Log',
    },
  ];

  useEffect(() => {
    setCustomBreadcrumbs({ 1: data?.requisitionNumber.toString() ?? '' });
  }, [setCustomBreadcrumbs, data?.requisitionNumber]);

  if (isLoading) return <DetailViewSkeleton />;

  const showIndicatorTab =
    !!data?.programName &&
    !!data?.otherParty.store &&
    programIndicators?.totalCount !== 0 &&
    !data?.isEmergency;

  if (showIndicatorTab) {
    tabs.push({
      Component: (
        <IndicatorsTab
          onClick={handleProgramIndicatorClick}
          isLoading={isLoading || isProgramIndicatorsLoading}
          request={data}
          indicators={programIndicators?.nodes}
        />
      ),
      value: t('label.indicators'),
    });
  }

  return !!data ? (
    <RequestRequisitionLineErrorProvider>
      <TableProvider
        createStore={createTableStore}
        queryParamsStore={createQueryParamsStore<RequestLineFragment>({
          initialSortBy: { key: 'itemName' },
        })}
      >
        <AppBarButtons
          isDisabled={!data || isDisabled}
          onAddItem={handleAddItem}
          showIndicators={showIndicatorTab}
        />
        <Toolbar />

        <DetailTabs tabs={tabs} />

        <Footer />
        <SidePanel />
        {isOpen && (
          <RequestLineEditModal
            isOpen={isOpen}
            onClose={onClose}
            itemId={selectedItemId}
          />
        )}
      </TableProvider>
    </RequestRequisitionLineErrorProvider>
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
      title={t('error.order-not-found')}
      message={t('messages.click-to-return-to-requisitions')}
    />
  );
};
