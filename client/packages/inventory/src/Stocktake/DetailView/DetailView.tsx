import React, { useEffect } from 'react';
import {
  useEditModal,
  DetailViewSkeleton,
  AlertModal,
  RouteBuilder,
  useNavigate,
  useTranslation,
  DetailTabs,
  useBreadcrumbs,
  useSimplifiedTabletUI,
  Box,
  useNonPaginatedMaterialTable,
  NothingHere,
  MaterialTable,
  usePreferences,
  StocktakeNodeStatus,
} from '@openmsupply-client/common';
import { ActivityLogList } from '@openmsupply-client/system';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { StocktakeLineEdit } from './modal/StocktakeLineEdit';
import { AppRoute } from '@openmsupply-client/config';
import { StocktakeLineFragment, useStocktakeOld } from '../api';
import { StocktakeLineErrorProvider } from '../context';
import { useStocktakeColumns } from './columns';
import { StocktakeErrorModal } from './StocktakeErrorModal';

export const DetailView = () => (
  <StocktakeLineErrorProvider>
    <DetailViewInner />
  </StocktakeLineErrorProvider>
);

const DetailViewInner = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const simplifiedTabletView = useSimplifiedTabletUI();

  const { data: stocktake, isLoading } = useStocktakeOld.document.get();
  const {
    isDisabled,
    isLoading: rowsLoading,
    lines,
  } = useStocktakeOld.line.rows();

  const { isOpen, entity, onOpen, onClose, mode } =
    useEditModal<StocktakeLineFragment['item']>();

  useEffect(() => {
    setCustomBreadcrumbs({ 1: stocktake?.stocktakeNumber.toString() ?? '' });
  }, [setCustomBreadcrumbs, stocktake?.stocktakeNumber]);

  // Blind stocktake: hide theoretical stock so physical counts can't be
  // reverse-engineered to match. While counting (status New) the snapshot and
  // difference are hidden and reappear once finalised; the reason is hidden for
  // the whole life of a blind stocktake (and not required - see backend).
  const { blindStocktake } = usePreferences();
  const isNewStocktake = stocktake?.status === StocktakeNodeStatus.New;
  const hideSnapshotStock = !!blindStocktake && isNewStocktake;
  const hideReason = !!blindStocktake;

  const columns = useStocktakeColumns({ hideSnapshotStock, hideReason });

  const { table, selectedRows } =
    useNonPaginatedMaterialTable<StocktakeLineFragment>({
      tableId: 'stocktake-detail',
      columns,
      isLoading: rowsLoading,
      data: lines,
      onRowClick: row => onOpen(row.item),
      grouping: { field: 'item.code' },
      initialSort: { key: 'itemName', dir: 'asc' },
      manualFiltering: true,
      getIsPlaceholderRow: row =>
        isUncounted(row.original) ||
        // Also mark parent rows as placeholder if any of its children are uncounted
        row.getLeafRows().some(leaf => isUncounted(leaf.original)),
      noDataElement: (
        <NothingHere
          body={t('error.no-stocktake-items')}
          onCreate={isDisabled ? undefined : onOpen}
          buttonText={t('button.add-item')}
        />
      ),
    });

  const tabs = [
    {
      Component: <MaterialTable table={table} />,
      value: 'Details',
    },
    {
      Component: <ActivityLogList recordId={stocktake?.id ?? ''} />,
      value: 'Log',
    },
  ];

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
    <>
      <AppBarButtons onAddItem={() => onOpen()} />

      <Footer
        selectedRows={selectedRows}
        resetRowSelection={table.resetRowSelection}
      />
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
          <MaterialTable table={table} />
        </Box>
      ) : (
        <DetailTabs tabs={tabs} />
      )}

      {isOpen && (
        <StocktakeLineEdit
          isOpen={isOpen}
          onClose={onClose}
          mode={mode}
          item={entity}
          isInitialStocktake={stocktake.isInitialStocktake}
          hideSnapshotStock={hideSnapshotStock}
          hideReason={hideReason}
        />
      )}
      <StocktakeErrorModal />
    </>
  );
};

const isUncounted = (line: StocktakeLineFragment): boolean =>
  line.countedNumberOfPacks === null;
