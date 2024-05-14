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
// import { Toolbar } from './Toolbar';
// import { Footer } from './Footer';
// import { AppBarButtons } from './AppBarButtons';
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

// const StocktakeTabs = ({
//   id,
//   isDisabled,
//   onOpen,
// }: {
//   id: string | undefined;
//   isDisabled: boolean;
//   onOpen: (item?: ItemRowFragment | null | undefined) => void;
// }) => {
//   const onRowClick = useCallback(
//     (item: StocktakeLineFragment | StocktakeSummaryItem) => {
//       if (item.item) onOpen(item.item);
//     },
//     [onOpen]
//   );

//   const tabs = [
//     {
//       Component: (
//         <ContentArea
//           onRowClick={!isDisabled ? onRowClick : null}
//           onAddItem={() => onOpen()}
//         />
//       ),
//       value: 'Details',
//     },
//     {
//       Component: <ActivityLogList recordId={id ?? ''} />,
//       value: 'Log',
//     },
//   ];
//   return <DetailTabs tabs={tabs} />;
// };

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
      {/* <AppBarButtons onAddItem={() => onOpen()} />

      <Footer />
      <SidePanel />

      <Toolbar />

      <StocktakeTabs
        id={stocktake?.id}
        onOpen={onOpen}
        isDisabled={isDisabled}
      /> */}
    </>
  );
};

interface UseDraftStockLineControl {
  draft: StockLineRowFragment;
  onUpdate: (patch: Partial<StockLineRowFragment>) => void;
  onSave: () => Promise<void>;
  isLoading: boolean;
}

const useDraftStockLine = (
  seed: StockLineRowFragment
): UseDraftStockLineControl => {
  const [stockLine, setStockLine] = useState<StockLineRowFragment>({ ...seed });
  const { mutate, isLoading } = useStock.line.update();

  useEffect(() => {
    setStockLine(seed);
  }, [seed]);

  const onUpdate = (patch: Partial<StockLineRowFragment>) => {
    const newStockLine = { ...stockLine, ...patch };
    if (ObjUtils.isEqual(stockLine, newStockLine)) return;
    setStockLine(newStockLine);
  };

  const onSave = async () => mutate(stockLine);

  return {
    draft: stockLine,
    onUpdate,
    onSave,
    isLoading,
  };
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
  } = useStockLine();
  //   const { draft, onUpdate, onSave } = useDraftStockLine(stockLine);
  const { dispatchEvent, addEventListener, removeEventListener } =
    usePluginEvents();
  const [hasChanged, setHasChanged] = useState(false);

  const t = useTranslation('inventory');
  const navigate = useNavigate();
  const { setSuffix } = useBreadcrumbs();

  React.useEffect(() => {
    setSuffix(data?.name ?? '');
  }, [data]);

  const plugins = usePluginElements({
    type: 'StockEditForm',
    data: stockLine,
  });

  console.log('data', data);

  const tabs = [
    // {
    //   Component: (
    //     <StockLineForm draft={draft} onUpdate={onUpdate} plugins={plugins} />
    //   ),
    //   value: 'label.details',
    // },
    // {
    //   Component: (
    //     <InventoryAdjustmentForm stockLine={draft} onUpdate={onUpdate} />
    //   ),
    //   value: 'label.adjust',
    // },
    // {
    //   Component: <ActivityLogList recordId={draft?.id ?? ''} />,
    //   value: 'label.log',
    // },
    // {
    //   Component: <LedgerForm stockLine={draft} />,
    //   value: 'label.ledger',
    // },
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

  return <DetailTabs tabs={tabs} />;
  //   <StocktakeLineErrorProvider></StocktakeLineErrorProvider>>
  //   const { isOpen, entity, onOpen, onClose, mode } =
  //     useEditModal<ItemRowFragment>();

  //   if (isLoading) return <DetailViewSkeleton hasGroupBy={true} hasHold={true} />;

  //   if (!stocktake?.lines || !stocktake)
  //     return (
  //       <AlertModal
  //         open={true}
  //         onOk={() =>
  //           navigate(
  //             RouteBuilder.create(AppRoute.Inventory)
  //               .addPart(AppRoute.Stocktakes)
  //               .build()
  //           )
  //         }
  //         title={t('error.stocktake-not-found')}
  //         message={t('messages.click-to-return')}
  //       />
  //     );

  //   return (
  //   <StocktakeLineErrorProvider>
  //       <TableProvider createStore={createTableStore}>
  //         <DetailViewComponent
  //           stocktake={stocktake}
  //           onOpen={onOpen}
  //           isDisabled={isDisabled}
  //         />
  //         {isOpen && (
  //           <StocktakeLineEdit
  //             isOpen={isOpen}
  //             onClose={onClose}
  //             mode={mode}
  //             item={entity}
  //           />
  //         )}
  //       </TableProvider>
  //   </StocktakeLineErrorProvider>
  //   );
};
