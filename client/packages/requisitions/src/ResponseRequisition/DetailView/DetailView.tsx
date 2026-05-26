import React, { useCallback, useEffect } from 'react';
import {
  DetailViewSkeleton,
  useNavigate,
  useTranslation,
  AlertModal,
  RouteBuilder,
  DetailTabs,
  useBreadcrumbs,
  useEditModal,
  useUrlQuery,
  AppFooterStatusPortal,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { ActivityLogList } from '@openmsupply-client/system';
import { Toolbar } from './Toolbar/Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { StatusFooter } from './Footer';
import { useResponse } from '../api';
import { DetailsTab, IndicatorsTab, Documents } from './Tabs';
import { ResponseRequisitionLineErrorProvider } from '../context';
import { CustomerRequisitionDetailTabs } from './types';

const DetailViewInner = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const { urlQuery, updateQuery } = useUrlQuery();

  const lineEditModal = useEditModal<string | null>();

  const { data, isLoading, invalidateQueries } = useResponse.document.get();
  const isDisabled = useResponse.utils.isDisabled();
  const { data: programIndicators, isLoading: isProgramIndicatorsLoading } =
    useResponse.document.indicators(
      data?.otherPartyId ?? '',
      data?.period?.id ?? '',
      data?.program?.id ?? '',
      !!data
    );

  const onAddItem = useCallback(() => {
    // The line-edit modal lives inside the Details tab. If the user is on
    // another tab, switch first so the modal mounts.
    const currentTab =
      urlQuery['tab'] ?? CustomerRequisitionDetailTabs.Details;
    if (currentTab !== CustomerRequisitionDetailTabs.Details) {
      updateQuery({ tab: CustomerRequisitionDetailTabs.Details });
    }
    lineEditModal.onOpen();
  }, [lineEditModal, urlQuery, updateQuery]);

  useEffect(() => {
    setCustomBreadcrumbs({ 1: data?.requisitionNumber.toString() ?? '' });
  }, [setCustomBreadcrumbs, data?.requisitionNumber]);

  if (isLoading) return <DetailViewSkeleton />;

  const showIndicatorTab =
    data?.programName &&
    !!data?.otherParty.store &&
    programIndicators?.totalCount !== 0 &&
    !data?.isEmergency;

  const tabs = [
    {
      Component: <DetailsTab lineEdit={lineEditModal} />,
      value: 'Details',
    },
    {
      Component: (
        <Documents data={data} invalidateQueries={invalidateQueries} />
      ),
      value: t('label.documents'),
    },
    {
      Component: <ActivityLogList recordId={data?.id ?? ''} />,
      value: 'Log',
    },
  ];

  if (showIndicatorTab) {
    tabs.push({
      Component: (
        <IndicatorsTab
          isLoading={isLoading || isProgramIndicatorsLoading}
          indicators={programIndicators?.nodes}
          disabled={isDisabled}
        />
      ),
      value: t('label.indicators'),
    });
  }

  return !!data ? (
    <>
      <AppBarButtons
        isDisabled={isDisabled}
        hasLinkedRequisition={!!data.linkedRequisition}
        isProgram={!!data.programName}
        onAddItem={onAddItem}
      />
      <Toolbar />
      <DetailTabs tabs={tabs} />
      {/* Fallback status footer for tabs that don't own the lines table.
        The Details tab's `Footer` mounts an `AppFooterPortal` only when rows
        are selected; otherwise this portal shows the status crumbs. */}
      <AppFooterStatusPortal Content={<StatusFooter />} />
      <SidePanel />
    </>
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

export const DetailView = () => {
  return (
    <ResponseRequisitionLineErrorProvider>
      <DetailViewInner />
    </ResponseRequisitionLineErrorProvider>
  );
};
