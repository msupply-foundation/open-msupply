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
  Groupable,
  NothingHere,
  MaterialTable,
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

export const DetailView = () => {
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

  const columns = useStocktakeColumns();

  const { table, selectedRows } = useNonPaginatedMaterialTable<
    Groupable<StocktakeLineFragment>
  >({
    tableId: 'stocktake-detail',
    columns,
    isLoading: rowsLoading,
    data: lines || [],
    onRowClick: row => onOpen(row.item),
    groupByField: 'itemName',
    initialSort: { key: 'itemName', dir: 'asc' },
    getIsPlaceholderRow: row =>
      !!(
        isUncounted(row) ||
        // Also mark parent rows as placeholder if any subRows are placeholders
        row.subRows?.some(isUncounted)
      ),
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
    <StocktakeLineErrorProvider>
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
        />
      )}
    </StocktakeLineErrorProvider>
  );
};

const isUncounted = (line: StocktakeLineFragment): boolean =>
  line.countedNumberOfPacks === null;
