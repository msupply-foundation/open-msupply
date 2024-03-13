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
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { Summary } from './Tabs';
import { AssetFragment, useAssets } from '../api';
import { StatusLogs } from './Tabs/StatusLogs';
import { Documents } from './Tabs/Documents';

export const EquipmentDetailView = () => {
  const { data, isLoading } = useAssets.document.get();
  const { mutateAsync: update, isLoading: isSaving } =
    useAssets.document.update();
  const navigate = useNavigate();
  const t = useTranslation('coldchain');
  const { setSuffix } = useBreadcrumbs();
  const [draft, setDraft] = useState<AssetFragment>();
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
      .catch(() => error(t('error.unable-to-save-asset'))());
  };

  const showSaveConfirmation = useConfirmationModal({
    onConfirm: save,
    message: t('messages.confirm-save-generic'),
    title: t('heading.are-you-sure'),
  });

  const onChange = (patch: Partial<AssetFragment>) => {
    if (!draft) return;
    setIsDirty(true);
    setDraft({ ...draft, ...patch });
  };

  useEffect(() => {
    setSuffix(data?.code ?? '');
  }, [setSuffix, data?.code]);

  useEffect(() => {
    if (!data) return;
    setDraft({ ...data });
  }, [data, setDraft]);

  if (isLoading) return <DetailFormSkeleton />;

  const tabs = [
    {
      Component: <Summary onChange={onChange} draft={draft} />,
      value: 'Summary',
    },
    {
      Component: <StatusLogs />,
      value: 'StatusLogs',
    },
    {
      Component: <Documents />,
      value: 'Documents',
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
