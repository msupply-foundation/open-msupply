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

const DetailViewComponent = ({
  //   stocktake,
  isDisabled,
  onOpen,
}: {
  //   stocktake: StocktakeFragment;
  isDisabled: boolean;
  onOpen: () => void;
}) => {
  const { HighlightStyles } = useRowHighlight();

  return (
    <>
      <HighlightStyles />
      {/* <AppBarButtons onAddItem={() => onOpen()} /> */}

      <Footer
        isSaving={false}
        showSaveConfirmation={() => {}}
        showCancelConfirmation={() => {}}
      />
      {/* <SidePanel /> */}

      {/* <Toolbar /> */}

      {/* <StocktakeTabs
        id={stocktake?.id}
        onOpen={onOpen}
        isDisabled={isDisabled}
      /> */}
    </>
  );
};

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
    updatePatch,
  } = useStockLine(id);
  const { HighlightStyles } = useRowHighlight();
  const { dispatchEvent, addEventListener, removeEventListener } =
    usePluginEvents();
  const [hasChanged, setHasChanged] = useState(false);

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
      Component: (
        <InventoryAdjustmentForm stockLine={draft} onUpdate={updatePatch} />
      ),
      value: t('label.adjust'),
    },
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

      <Footer
        isSaving={false}
        showSaveConfirmation={() => {}}
        showCancelConfirmation={() => {}}
      />
      {/* <SidePanel /> */}

      <TableProvider createStore={createTableStore}>
        <DetailTabs tabs={tabs} />
      </TableProvider>
    </>
  );
};
