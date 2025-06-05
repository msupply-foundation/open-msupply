import React, { useCallback, useEffect } from 'react';
import {
  TableProvider,
  createTableStore,
  DetailViewSkeleton,
  useNavigate,
  useTranslation,
  AlertModal,
  RouteBuilder,
  createQueryParamsStore,
  DetailTabs,
  IndicatorLineRowNode,
  useBreadcrumbs,
  useEditModal,
  useAuthContext,
  usePreference,
  PreferenceKey,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { ActivityLogList } from '@openmsupply-client/system';
import { Toolbar } from './Toolbar/Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { ContentArea } from './ContentArea';
import { useResponse, ResponseLineFragment, ResponseFragment } from '../api';
import { IndicatorsTab } from './IndicatorsTab';
import { ResponseRequisitionLineErrorProvider } from '../context';
import { ProgramIndicatorFragment } from '../../RequestRequisition/api';
import { buildIndicatorEditRoute } from './utils';
import { ResponseLineEditModal } from './ResponseLineEdit';

export const DetailView = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const { store } = useAuthContext();
  const { data: { manageVaccinesInDoses } = { manageVaccinesInDoses: false } } =
    usePreference(PreferenceKey.ManageVaccinesInDoses);
  const {
    onOpen,
    onClose,
    mode,
    entity: itemId,
    isOpen,
  } = useEditModal<string | null>();

  const { data, isLoading } = useResponse.document.get();
  const isDisabled = useResponse.utils.isDisabled();
  const { data: programIndicators, isLoading: isProgramIndicatorsLoading } =
    useResponse.document.indicators(
      data?.otherPartyId ?? '',
      data?.period?.id ?? '',
      data?.program?.id ?? '',
      !!data
    );

  const onRowClick = useCallback(
    (line: ResponseLineFragment) => {
      onOpen(line.item.id);
    },
    [onOpen]
  );

  const onProgramIndicatorClick = useCallback(
    (
      programIndicator?: ProgramIndicatorFragment,
      indicatorLine?: IndicatorLineRowNode,
      response?: ResponseFragment
    ) => {
      if (!response || !indicatorLine) return;
      navigate(
        buildIndicatorEditRoute(
          response.id,
          String(programIndicator?.code),
          indicatorLine.id
        )
      );
    },
    []
  );

  const onAddItem = () => {
    onOpen();
  };

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
      Component: (
        <ContentArea
          onAddItem={onAddItem}
          onRowClick={onRowClick}
          disableAddLine={
            isDisabled || !!data?.linkedRequisition || !!data?.programName
          }
          manageVaccinesInDoses={manageVaccinesInDoses}
        />
      ),
      value: 'Details',
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
          onClick={onProgramIndicatorClick}
          isLoading={isLoading || isProgramIndicatorsLoading}
          response={data}
          indicators={programIndicators?.nodes}
        />
      ),
      value: t('label.indicators'),
    });
  }

  return !!data ? (
    <ResponseRequisitionLineErrorProvider>
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
          onAddItem={onAddItem}
        />
        <Toolbar />
        <DetailTabs tabs={tabs} />

        <Footer />
        <SidePanel />
        {isOpen && (
          <ResponseLineEditModal
            requisition={data}
            itemId={itemId}
            store={store}
            mode={mode}
            isOpen={isOpen}
            onClose={onClose}
            manageVaccinesInDoses={manageVaccinesInDoses}
          />
        )}
      </TableProvider>
    </ResponseRequisitionLineErrorProvider>
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
