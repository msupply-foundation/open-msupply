import React, { useEffect } from 'react';
import {
  TableProvider,
  createTableStore,
  useTranslation,
  DetailTabs,
  useRowHighlight,
  // usePluginElements,
  // usePluginEvents,
  // PluginEventListener,
  useBreadcrumbs,
  useParams,
  useConfirmationModal,
  useNotification,
} from '@openmsupply-client/common';
import { ActivityLogList } from '@openmsupply-client/system';
import { AppBarButtons } from './AppBarButtons';
import { useStockLine } from '../api';
import { StockLineForm } from '../Components/StockLineForm';
import { LedgerForm } from '../Components/Ledger';

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
  const { HighlightStyles } = useRowHighlight();
  // const { dispatchEvent, addEventListener, removeEventListener } =
  //   usePluginEvents();
  // const [hasChanged, setHasChanged] = useState(false);
  const { success, error } = useNotification();

  const t = useTranslation('inventory');
  //   const navigate = useNavigate();
  const { setSuffix } = useBreadcrumbs();

  useEffect(() => {
    if (!data) return;
    setSuffix(data?.item.name ?? '');
  }, [data]);

  // const plugins = usePluginElements({
  //   type: 'StockEditForm',
  //   data: stockLine,
  // });

  const showSaveConfirmation = useConfirmationModal({
    onConfirm: () =>
      update()
        .then(() => {
          const successSnack = success(t('success.data-saved'));
          successSnack();
        })
        .catch(err => {
          const errorSnack = error(err.message);
          errorSnack();
        }),
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
          // plugins={plugins}
          footerProps={{
            isSaving: isUpdating,
            showSaveConfirmation,
            showCancelConfirmation,
            isDirty,
          }}
        />
      ),
      value: t('label.details'),
    },
    // TO-DO: Add Inv Adjustment to Modal
    // {
    //   Component: (
    //     <InventoryAdjustmentForm stockLine={draft} onUpdate={updatePatch} />
    //   ),
    //   value: t('label.adjust'),
    // },
    {
      Component: <ActivityLogList recordId={data?.id ?? ''} />,
      value: t('label.log'),
    },
    {
      Component: <LedgerForm stockLine={draft} />,
      value: t('label.ledger'),
    },
  ];

  // const onChange = () => setHasChanged(true);

  // useEffect(() => {
  //   const listener: PluginEventListener = {
  //     eventType: 'onChangeStockEditForm',
  //     listener: onChange,
  //   };

  //   addEventListener(listener);

  //   return () => removeEventListener(listener);
  // }, [addEventListener, removeEventListener]);

  return (
    <>
      <HighlightStyles />
      <AppBarButtons />
      {/* <Toolbar /> */}
      <TableProvider createStore={createTableStore}>
        <DetailTabs tabs={tabs} />
      </TableProvider>
    </>
  );
};
