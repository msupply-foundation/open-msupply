import React, { useEffect, useState } from 'react';
import {
  AlertModal,
  useNavigate,
  RouteBuilder,
  useTranslation,
  DetailTabs,
  DetailFormSkeleton,
  useBreadcrumbs,
  useConfirmationModal,
  useNotification,
  useConfirmOnLeaving,
  TableProvider,
  createTableStore,
  ObjUtils,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { Summary } from './Tabs';
import { useAssets } from '../api';
import { StatusLogs } from './Tabs/StatusLogs';
import { Documents } from './Tabs/Documents';
import { ActivityLogList, useLocation } from '@openmsupply-client/system';
import { DraftAsset } from '../types';
import { Details } from './Tabs/Details';

export const EquipmentDetailView = () => {
  const { data, isLoading } = useAssets.document.get();
  const { mutateAsync: update, isLoading: isSaving } =
    useAssets.document.update();
  const { data: locationData, isLoading: isLoadingLocations } =
    useLocation.document.list({
      sortBy: {
        key: 'name',
        direction: 'asc',
      },
      filterBy: { assignedToAsset: false, storeId: { equalTo: data?.storeId } },
    });
  const navigate = useNavigate();
  const t = useTranslation('coldchain');
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const [draft, setDraft] = useState<DraftAsset>();
  const [isDirty, setIsDirty] = useState(false);
  const { error, success } = useNotification();

  useConfirmOnLeaving(isDirty);

  const save = async () => {
    if (!draft) return;
    await update(draft)
      .then(() => {
        setIsDirty(false);
        success(t('messages.asset-saved'))();
      })
      .catch(e => error(`${t('error.unable-to-save-asset')}: ${e.message}`)());
  };

  const showSaveConfirmation = useConfirmationModal({
    onConfirm: save,
    message: t('messages.confirm-save-generic'),
    title: t('heading.are-you-sure'),
  });

  const onChange = (patch: Partial<DraftAsset>) => {
    if (!draft) return;
    setIsDirty(true);
    setDraft({ ...draft, ...patch });
  };

  useEffect(() => {
    setCustomBreadcrumbs({ 1: data?.assetNumber ?? '' });
  }, [setCustomBreadcrumbs, data?.assetNumber]);

  useEffect(() => {
    if (!data) return;

    const assetProperties = ObjUtils.parse(data.properties);
    const catalogProperties = ObjUtils.parse(data.catalogProperties);

    setDraft({
      ...data,
      locationIds: draft?.locationIds
        ? draft.locationIds
        : data.locations.nodes.map(location => location.id),
      parsedProperties: assetProperties,
      parsedCatalogProperties: catalogProperties,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, setDraft]);

  const locations =
    locationData?.nodes.map(location => ({
      label: location.code,
      value: location.id,
    })) || [];

  if (isLoading || isLoadingLocations) return <DetailFormSkeleton />;

  const tabs = [
    {
      Component: (
        <Summary onChange={onChange} draft={draft} locations={locations} />
      ),
      value: 'Summary',
    },
    {
      Component: <Details onChange={onChange} draft={draft} />,
      value: 'Details',
    },
    {
      Component: draft === undefined ? null : <StatusLogs assetId={draft.id} />,
      value: 'StatusHistory',
    },
    {
      Component: draft === undefined ? null : <Documents draft={draft} />,
      value: 'Documents',
    },
    {
      Component: (
        <TableProvider createStore={createTableStore}>
          <ActivityLogList recordId={data?.id ?? ''} />
        </TableProvider>
      ),
      value: 'Log',
    },
  ];

  return (
    <React.Suspense fallback={<DetailFormSkeleton />}>
      {data ? (
        <>
          <AppBarButtons />
          <Toolbar />
          <DetailTabs tabs={tabs} />
          <Footer
            isDirty={isDirty}
            isSaving={isSaving}
            showSaveConfirmation={showSaveConfirmation}
          />
        </>
      ) : (
        <AlertModal
          open={true}
          onOk={() =>
            navigate(
              RouteBuilder.create(AppRoute.Coldchain)
                .addPart(AppRoute.Equipment)
                .build()
            )
          }
          title={t('error.asset-not-found')}
          message={t('messages.click-to-return-to-assets')}
        />
      )}
    </React.Suspense>
  );
};
