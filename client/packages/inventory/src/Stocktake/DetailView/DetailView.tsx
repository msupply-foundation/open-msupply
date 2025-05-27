import React, { useCallback, useEffect } from 'react';
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
  useBreadcrumbs,
  PreferenceKey,
  usePreference,
  useSimplifiedTabletUI,
  Box,
} from '@openmsupply-client/common';
import { ActivityLogList } from '@openmsupply-client/system';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { StocktakeSummaryItem } from '../../types';
import { StocktakeLineEdit } from './modal/StocktakeLineEdit';
import { ContentArea } from './ContentArea';
import { AppRoute } from '@openmsupply-client/config';
import {
  StocktakeFragment,
  StocktakeLineFragment,
  useStocktakeOld,
} from '../api';
import { StocktakeLineErrorProvider } from '../context';
import { isStocktakeDisabled } from '../../utils';

const StocktakeTabs = ({
  id,
  isDisabled,
  onOpen,
  onRowClick,
}: {
  id: string | undefined;
  isDisabled: boolean;
  onOpen: (item?: StocktakeLineFragment['item'] | null | undefined) => void;
  onRowClick: (item: StocktakeLineFragment | StocktakeSummaryItem) => void;
}) => {
  const tabs = [
    {
      Component: (
        <ContentArea
          onRowClick={!isDisabled ? onRowClick : null}
          onAddItem={() => onOpen()}
        />
      ),
      value: 'Details',
    },
    {
      Component: <ActivityLogList recordId={id ?? ''} />,
      value: 'Log',
    },
  ];
  return <DetailTabs tabs={tabs} />;
};

const DetailViewComponent = ({
  stocktake,
  isDisabled,
  onOpen,
}: {
  stocktake: StocktakeFragment;
  isDisabled: boolean;
  onOpen: (item?: StocktakeLineFragment['item'] | null | undefined) => void;
}) => {
  const { HighlightStyles } = useRowHighlight();
  const simplifiedTabletView = useSimplifiedTabletUI();

  const onRowClick = useCallback(
    (item: StocktakeLineFragment | StocktakeSummaryItem) => {
      if (item.item) onOpen(item.item);
    },
    [onOpen]
  );

  return (
    <>
      <HighlightStyles />
      <AppBarButtons onAddItem={() => onOpen()} />

      <Footer />
      <SidePanel />

      <Toolbar />
      {simplifiedTabletView ? (
        <Box
          sx={{
            display: 'flex',
            flex: 1,
            justifyContent: 'center',
          }}
        >
          <ContentArea
            onRowClick={!isDisabled ? onRowClick : null}
            onAddItem={() => onOpen()}
          />
        </Box>
      ) : (
        <StocktakeTabs
          id={stocktake?.id}
          onOpen={onOpen}
          onRowClick={onRowClick}
          isDisabled={isDisabled}
        />
      )}
    </>
  );
};

export const DetailView = () => {
  const { data: stocktake, isLoading } = useStocktakeOld.document.get();
  const { data: preferences } = usePreference(
    PreferenceKey.AllowTrackingOfStockByDonor
  );

  const isDisabled = !stocktake || isStocktakeDisabled(stocktake);
  const t = useTranslation();
  const { setCustomBreadcrumbs } = useBreadcrumbs();

  const navigate = useNavigate();
  const { isOpen, entity, onOpen, onClose, mode } =
    useEditModal<StocktakeLineFragment['item']>();

  useEffect(() => {
    setCustomBreadcrumbs({ 1: stocktake?.stocktakeNumber.toString() ?? '' });
  }, [setCustomBreadcrumbs, stocktake?.stocktakeNumber]);

  if (isLoading) return <DetailViewSkeleton hasGroupBy={true} hasHold={true} />;

  if (!stocktake?.lines || !stocktake)
    return (
      <AlertModal
        open={true}
        onOk={() =>
          navigate(
            RouteBuilder.create(AppRoute.Inventory)
              .addPart(AppRoute.Stocktakes)
              .build()
          )
        }
        title={t('error.stocktake-not-found')}
        message={t('messages.click-to-return')}
      />
    );

  return (
    <StocktakeLineErrorProvider>
      <TableProvider createStore={createTableStore}>
        <DetailViewComponent
          stocktake={stocktake}
          onOpen={onOpen}
          isDisabled={isDisabled}
        />
        {isOpen && (
          <StocktakeLineEdit
            isOpen={isOpen}
            onClose={onClose}
            mode={mode}
            item={entity}
            isInitialStocktake={stocktake.isInitialStocktake}
            enableDonorTracking={
              preferences?.[PreferenceKey.AllowTrackingOfStockByDonor] ?? false
            }
          />
        )}
      </TableProvider>
    </StocktakeLineErrorProvider>
  );
};
