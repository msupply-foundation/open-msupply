import React, { useEffect, useState } from 'react';
import {
  TableProvider,
  createTableStore,
  useTranslation,
  DetailTabs,
  usePluginElements,
  usePluginEvents,
  PluginEventListener,
  useBreadcrumbs,
  useParams,
  useConfirmationModal,
  useNotification,
  useUrlQuery,
  useToggle,
  StockLineNode,
} from '@openmsupply-client/common';
import { ActivityLogList } from '@openmsupply-client/system';
import { AppBarButtons } from './AppBarButtons';
import { useStockLine } from '../api';
import { StockLineForm } from '../Components/StockLineForm';
import { LedgerTable } from '../Components/Ledger';
import { Footer } from './Footer';
import { RepackModal } from '../Components';
import { InventoryAdjustmentModal } from '../Components';

export const StockLineDetailView: React.FC = () => {
  const { id } = useParams();
  const {
    query: { data, isLoading },
    draft,
    resetDraft,
    updatePatch,
    isDirty,
    update: { update, isUpdating },
  } = useStockLine(id);
  const { dispatchEvent, addEventListener, removeEventListener } =
    usePluginEvents();
  const {
    urlQuery: { tab },
  } = useUrlQuery();
  const { success, error } = useNotification();
  const t = useTranslation('inventory');
  const { setCustomBreadcrumbs } = useBreadcrumbs();

  const repackModalController = useToggle();
  const adjustmentModalController = useToggle();

  const [hasPluginChanged, setHasPluginChanged] = useState(false);
  const plugins = usePluginElements({
    type: 'StockEditForm',
    data,
  });

  useEffect(() => {
    setCustomBreadcrumbs({ 1: data?.item.name ?? '' });
  }, [setCustomBreadcrumbs, data]);

  const onPluginChange = () => setHasPluginChanged(true);
  useEffect(() => {
    const listener: PluginEventListener = {
      eventType: 'onChangeStockEditForm',
      listener: onPluginChange,
    };

    addEventListener(listener);

    return () => removeEventListener(listener);
  }, [addEventListener, removeEventListener]);

  const showSaveConfirmation = useConfirmationModal({
    onConfirm: () => {
      update()
        .then(() => {
          dispatchEvent('onSaveStockEditForm', new Event(draft.id));
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

  const showCancelConfirmation = useConfirmationModal({
    onConfirm: resetDraft,
    message: t('messages.confirm-cancel-generic'),
    title: t('heading.are-you-sure'),
  });

  const tabs = [
    {
      Component: (
        <StockLineForm
          loading={isLoading}
          draft={draft}
          onUpdate={updatePatch}
          plugins={plugins}
        />
      ),
      value: t('label.details'),
    },
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
    disabled: !isDirty && !hasPluginChanged,
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
        openAdjust={adjustmentModalController.toggleOn}
      />
      <TableProvider createStore={createTableStore}>
        <DetailTabs tabs={tabs} />
        {(tab === t('label.details') || !tab) && <Footer {...footerProps} />}
      </TableProvider>
    </>
  );
};
