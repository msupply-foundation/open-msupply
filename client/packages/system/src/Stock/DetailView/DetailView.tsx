import React, { useEffect } from 'react';
import {
  TableProvider,
  createTableStore,
  useTranslation,
  DetailTabs,
  useBreadcrumbs,
  useParams,
  useConfirmationModal,
  useNotification,
  useUrlQuery,
  useToggle,
  StockLineNode,
  useCallbackWithPermission,
  UserPermission,
  usePluginEvents,
  useConfirmOnLeaving,
  useSimplifiedTabletUI,
  usePreference,
  PreferenceKey,
} from '@openmsupply-client/common';
import { ActivityLogList } from '@openmsupply-client/system';
import { AppBarButtons } from './AppBarButtons';
import { useStockLine } from '../api';
import { StockLineForm } from '../Components/StockLineForm';
import { LedgerTable } from '../Components/Ledger';
import { Footer } from './Footer';
import { RepackModal } from '../Components';
import { InventoryAdjustmentModal } from '../Components';
import { StatusHistory } from '../Components/StatusHistory';

export const StockLineDetailView: React.FC = () => {
  const t = useTranslation();
  const { id } = useParams();
  const {
    query: { data, isLoading },
    draft,
    resetDraft,
    updatePatch,
    isDirty,
    update: { update, isUpdating },
  } = useStockLine(id);
  const pluginEvents = usePluginEvents({ isDirty: false });
  const {
    urlQuery: { tab },
  } = useUrlQuery();
  const { success, error } = useNotification();
  const { setCustomBreadcrumbs, navigateUpOne } = useBreadcrumbs();

  const simplifiedTabletView = useSimplifiedTabletUI();
  const repackModalController = useToggle();
  const adjustmentModalController = useToggle();

  useEffect(() => {
    setCustomBreadcrumbs({ 1: data?.item.name ?? '' });
  }, [setCustomBreadcrumbs, data]);

  const showSaveConfirmation = useConfirmationModal({
    onConfirm: () => {
      update()
        .then(async () => {
          await pluginEvents.dispatchEvent({ id: draft.id });
          const successSnack = success(t('success.data-saved'));
          successSnack();
        })
        .catch(err => {
          const errorSnack = error(err.message);
          errorSnack();
        });
    },
    message: t('messages.confirm-save-generic'),
    title: t('heading.are-you-sure'),
  });

  const onCancel = () => {
    resetDraft();
    navigateUpOne();
  };

  const showCancelConfirmation = useConfirmationModal({
    onConfirm: onCancel,
    message: t('messages.confirm-cancel-generic'),
    title: t('heading.are-you-sure'),
  });

  const { setIsDirty } = useConfirmOnLeaving('view-stock');

  useEffect(() => {
    // Getting isDirty from 'draftStockLine' rather than from 'useConfirmOnLeaving' hook
    // so need to update it manually to sync external isDirty state with hook's isDirty state
    setIsDirty(isDirty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty]);

  const openInventoryAdjustmentModal = useCallbackWithPermission(
    UserPermission.InventoryAdjustmentMutate,
    adjustmentModalController.toggleOn
  );

  const isVaccine = draft?.item?.isVaccine ?? false;
  const { data: preferences } = usePreference(
    PreferenceKey.ManageVvmStatusForStock
  );

  const tabs = [
    {
      Component: (
        <StockLineForm
          loading={isLoading}
          draft={draft}
          onUpdate={updatePatch}
          pluginEvents={pluginEvents}
        />
      ),
      value: t('label.details'),
    },
    ...(isVaccine && preferences?.manageVvmStatusForStock
      ? [
          {
            Component: <StatusHistory draft={draft} isLoading={isLoading} />,
            value: t('label.statushistory'),
          },
        ]
      : []),
    {
      Component: <ActivityLogList recordId={data?.id ?? ''} />,
      value: t('label.log'),
    },
    {
      Component: <LedgerTable stockLine={draft} />,
      value: t('label.ledger'),
    },
  ];

  const footerProps = {
    isSaving: isUpdating,
    showSaveConfirmation,
    showCancelConfirmation,
    disabled: !isDirty && !pluginEvents.state.isDirty,
    isDirty,
  };

  return (
    <>
      {repackModalController.isOn && data && (
        <RepackModal
          isOpen={repackModalController.isOn}
          onClose={repackModalController.toggleOff}
          stockLine={data as StockLineNode}
        />
      )}
      {adjustmentModalController.isOn && (
        <InventoryAdjustmentModal
          stockLine={data as StockLineNode}
          isOpen={adjustmentModalController.isOn}
          onClose={adjustmentModalController.toggleOff}
        />
      )}
      <AppBarButtons
        openRepack={repackModalController.toggleOn}
        openAdjust={openInventoryAdjustmentModal}
      />
      <TableProvider createStore={createTableStore}>
        <DetailTabs tabs={tabs} />
        {(tab === t('label.details') || !tab || simplifiedTabletView) && (
          <Footer {...footerProps} />
        )}
      </TableProvider>
    </>
  );
};
