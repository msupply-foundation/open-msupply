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
  useAuthContext,
  useIsCentralServerApi,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { Summary } from './Tabs';
import { useAssets } from '../api';
import { StatusLogs } from './Tabs/StatusLogs';
import { Documents } from './Tabs/Documents';
import {
  ActivityLogList,
  LocationRowFragment,
  useLocationList,
} from '@openmsupply-client/system';
import { DraftAsset } from '../types';
import { Details } from './Tabs/Details';

export const useEquipmentDetailView = () => {
  const { storeId } = useAuthContext();
  const isCentralServer = useIsCentralServerApi();
  const { data, isLoading } = useAssets.document.get();
  const { mutateAsync: update, isLoading: isSaving } =
    useAssets.document.update();
  const {
    query: { data: locationData, isLoading: isLoadingLocations },
  } = useLocationList({
    sortBy: {
      key: 'name',
      direction: 'asc',
    },
    filterBy: { assignedToAsset: false, storeId: { equalTo: data?.storeId } },
  });
  const navigate = useNavigate();
  const t = useTranslation();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const [draft, setDraft] = useState<DraftAsset>();
  const { error, success } = useNotification();

  const { isDirty, setIsDirty } = useConfirmOnLeaving('equipment-detail-view');

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
    const canEditLocationIds = !isCentralServer || draft?.storeId == storeId;
    const locationIds = draft?.locationIds
      ? draft.locationIds
      : data.locations.nodes.map(location => location.id);

    setDraft({
      ...data,
      locationIds: canEditLocationIds ? locationIds : undefined,
      parsedProperties: assetProperties,
      parsedCatalogProperties: catalogProperties,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, setDraft]);

  const locations =
    locationData?.nodes.map(location => ({
      label: formatLocationLabel(location),
      value: location.id,
    })) || [];

  // Any locations that are already assigned to the asset won't be returned by the query above
  // So we add them in manually here...
  if (data && data?.locations.nodes.length) {
    const assignedLocations = data.locations.nodes.map(location => ({
      label: formatLocationLabel(location),
      value: location.id,
    }));
    locations.push(...assignedLocations);
  }

  return {
    isLoading,
    isLoadingLocations,
    onChange,
    draft,
    locations,
    data,
    isDirty,
    isSaving,
    showSaveConfirmation,
    navigate,
    t,
  };
};

export const EquipmentDetailView = () => {
  const {
    isLoading,
    isLoadingLocations,
    onChange,
    draft,
    locations,
    data,
    isDirty,
    isSaving,
    showSaveConfirmation,
    navigate,
    t,
  } = useEquipmentDetailView();

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

// Displays location with storage name if present, e.g. "ABC (Cold store)".
// If not present, just displays the code alone
export const formatLocationLabel = (location: LocationRowFragment) => {
  const { code, coldStorageType } = location;
  return `${code}${coldStorageType ? ` (${coldStorageType.name})` : ''}`;
};
