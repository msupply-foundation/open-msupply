import React, { useCallback, useEffect, useState } from 'react';
import {
  TableProvider,
  createTableStore,
  useEditModal,
  DetailViewSkeleton,
  AlertModal,
  RouteBuilder,
  useNavigate,
  useTranslation,
  DetailTabs,
  useRowHighlight,
  usePluginElements,
  usePluginEvents,
  PluginEventListener,
  ObjUtils,
  useBreadcrumbs,
  useQuery,
  useParams,
  useConfirmationModal,
  useNotification,
} from '@openmsupply-client/common';
import {
  ItemRowFragment,
  ActivityLogList,
  StockLineRowFragment,
} from '@openmsupply-client/system';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
// import { SidePanel } from './SidePanel';
// import { StocktakeSummaryItem } from '../../types';
// import { StocktakeLineEdit } from './modal/StocktakeLineEdit';
// import { ContentArea } from './ContentArea';
// import { AppRoute } from '@openmsupply-client/config';
// import { StocktakeFragment, StocktakeLineFragment, useStocktake } from '../api';
// import { StocktakeLineErrorProvider } from '../context';
// import { isStocktakeDisabled } from '../../utils';
import { StockLineRowFragment, useStock, useStockLine } from '../api';
import { StockLineForm } from '../Components/StockLineForm';
import { InventoryAdjustmentForm } from '../Components/InventoryAdjustment';
import { LedgerForm } from '../Components/Ledger';

interface StockLineEditProps {
  stockLine: StockLineRowFragment;
}

export const StockLineDetailView: React.FC<StockLineEditProps> = ({
  stockLine,
}) => {
  const { id } = useParams();
  const {
    query: { data, isLoading },
    draft,
    resetDraft,
    updatePatch,
    isDirty,
    update: { update, isUpdating, updateError },
  } = useStockLine(id);
  const { HighlightStyles } = useRowHighlight();
  const { dispatchEvent, addEventListener, removeEventListener } =
    usePluginEvents();
  const [hasChanged, setHasChanged] = useState(false);
  const { success, error } = useNotification();

  const t = useTranslation('inventory');
  //   const navigate = useNavigate();
  const { setSuffix } = useBreadcrumbs();

  useEffect(() => {
    setSuffix(data?.item.name ?? '');
  }, [data]);

  const plugins = usePluginElements({
    type: 'StockEditForm',
    data: stockLine,
  });

  const showSaveConfirmation = useConfirmationModal({
    onConfirm: () =>
      update()
        .then(() => {
          const successSnack = success(t('success.data-saved'));
          successSnack();
        })
        .catch(err => {
          const errorSnack = success(err.message);
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
          onUpdate={newData => {
            updatePatch(newData);
            setHasChanged(true);
          }}
          plugins={plugins}
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

  const onChange = () => setHasChanged(true);

  useEffect(() => {
    const listener: PluginEventListener = {
      eventType: 'onChangeStockEditForm',
      listener: onChange,
    };

    addEventListener(listener);

    return () => removeEventListener(listener);
  }, [addEventListener, removeEventListener]);

  return (
    <>
      <HighlightStyles />
      <AppBarButtons onAddItem={() => {}} />
      {/* <Toolbar /> */}
      <TableProvider createStore={createTableStore}>
        <DetailTabs tabs={tabs} />
      </TableProvider>
    </>
  );
};
