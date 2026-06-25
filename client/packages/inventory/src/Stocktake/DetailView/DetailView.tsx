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
  AppFooterStatusPortal,
  useQueryClient,
} from '@openmsupply-client/common';
import { ActivityLogList, DocumentsTab } from '@openmsupply-client/system';
import { Toolbar } from './Toolbar';
import { Footer, StatusFooter } from './Footer';
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

  const stocktakeApi = useStocktakeOld.utils.api();
  const queryClient = useQueryClient();
  const invalidateDocuments = () =>
    queryClient.invalidateQueries({
      queryKey: stocktakeApi.keys.detail(stocktake?.id ?? ''),
    });

  const { isOpen, entity, onOpen, onClose, mode } =
    useEditModal<StocktakeLineFragment['item']>();

  useEffect(() => {
    setCustomBreadcrumbs({ 1: stocktake?.stocktakeNumber.toString() ?? '' });
  }, [setCustomBreadcrumbs, stocktake?.stocktakeNumber]);

  const columns = useStocktakeColumns();

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
      Component: (
        <DocumentsTab
          documents={stocktake?.documents.nodes ?? []}
          recordId={stocktake?.id ?? ''}
          tableName="stocktake"
          invalidateQueries={invalidateDocuments}
        />
      ),
      value: 'Documents',
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

      {/* Fallback status footer for tabs that don't own the lines table.
        The lines table's `Footer` mounts an `AppFooterPortal` only when
        rows are selected; otherwise this portal shows the status crumbs. */}
      <AppFooterStatusPortal Content={<StatusFooter />} />

      {isOpen && (
        <StocktakeLineEdit
          isOpen={isOpen}
          onClose={onClose}
          mode={mode}
          item={entity}
          isInitialStocktake={stocktake.isInitialStocktake}
        />
      )}
      <StocktakeErrorModal />
    </>
  );
};

const isUncounted = (line: StocktakeLineFragment): boolean =>
  line.countedNumberOfPacks === null;
